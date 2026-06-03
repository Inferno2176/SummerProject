use std::io::Write;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

use crate::db::DbPool;
use crate::services::resume::{
    extractor::extract_resume_text,
    normalizer::normalize_resume_text,
    parser::{parse_resume_text, ParsedResume},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResumeResponse {
    pub success: bool,
    pub filename: String,
    pub parsed_resume: ParsedResume,
}

// OLD command — keep for compatibility
#[tauri::command]
pub async fn upload_resume(
    app: AppHandle,
    file_path: String,
) -> Result<UploadResumeResponse, String> {
    let pool = app.state::<DbPool>();

    let raw_text = extract_resume_text(&file_path)
        .await
        .map_err(|e| e.to_string())?;

    let normalized = normalize_resume_text(&raw_text);
    let parsed = parse_resume_text(&normalized, "")
        .await
        .map_err(|e| e.to_string())?;

    let filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("resume")
        .to_string();

    save_resume_to_db(&pool, &filename, &parsed).await?;

    Ok(UploadResumeResponse { success: true, filename, parsed_resume: parsed })
}

// NEW command — frontend sends raw bytes
#[tauri::command]
pub async fn parse_and_store_resume(
    app: AppHandle,
    file_name: String,
    file_bytes: Vec<u8>,
) -> Result<UploadResumeResponse, String> {
    let pool = app.state::<DbPool>();

    // Write bytes to temp file so extractor can read it
    let ext = std::path::Path::new(&file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("pdf")
        .to_string();

    let tmp_path = std::env::temp_dir().join(format!("cf_resume_{}.{}", Uuid::new_v4(), ext));

    {
        let mut f = std::fs::File::create(&tmp_path)
            .map_err(|e| format!("Failed to write temp file: {}", e))?;
        f.write_all(&file_bytes)
            .map_err(|e| format!("Failed to write bytes: {}", e))?;
    }

    let tmp_str = tmp_path.to_string_lossy().to_string();

    // Extract text
    let raw_text = extract_resume_text(&tmp_str)
        .await
        .map_err(|e| e.to_string())?;

    // Cleanup temp file
    let _ = std::fs::remove_file(&tmp_path);

    let normalized = normalize_resume_text(&raw_text);

    let parsed = parse_resume_text(&normalized, "")
        .await
        .map_err(|e| e.to_string())?;

    // Save to DB
    save_resume_to_db(&pool, &file_name, &parsed).await?;

    Ok(UploadResumeResponse {
        success: true,
        filename: file_name,
        parsed_resume: parsed,
    })
}

#[tauri::command]
pub async fn get_default_resume(app: AppHandle) -> Result<serde_json::Value, String> {
    use crate::db::get_connection;
    let pool = app.state::<DbPool>();
    let conn = get_connection(&pool).await.map_err(|e| e.to_string())?;

    conn.interact(|conn| {
        conn.query_row(
            "SELECT parsed_content FROM resumes WHERE is_default = 1 ORDER BY created_at DESC LIMIT 1",
            [],
            |row| row.get::<_, String>(0),
        )
    })
    .await
    .map_err(|e| format!("Interact failed: {}", e))?
    .map_err(|e| format!("DB error: {}", e))
    .map(|content| serde_json::json!({ "parsed_content": content }))
}


async fn save_resume_to_db(
    pool: &DbPool,
    filename: &str,
    parsed: &ParsedResume,
) -> Result<(), String> {
    use crate::db::get_connection;

    let json = serde_json::to_string(parsed)
        .map_err(|e| format!("Failed to serialize resume: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let filename = filename.to_string();
    let json_clone = json.clone();
    let now_clone = now.clone();

    let conn = get_connection(pool).await.map_err(|e| e.to_string())?;

    conn.interact(move |conn| {
        // Ensure the local user exists before inserting resume and profile records.
        conn.execute(
            "INSERT OR IGNORE INTO users (id, email, name, created_at, updated_at)
             VALUES ('local', 'local@careerforges.local', 'Local User', ?1, ?1)",
            rusqlite::params![now_clone],
        )?;

        // Save to resumes table
        conn.execute(
            "INSERT OR REPLACE INTO resumes (id, user_id, filename, file_path, parsed_content, is_default, created_at, updated_at)
             VALUES (?1, 'local', ?2, '', ?3, 1, ?4, ?4)",
            rusqlite::params![id, filename, json_clone, now_clone],
        )?;

        // Save to user_profiles for quick access
        conn.execute(
            "INSERT OR REPLACE INTO user_profiles (id, user_id, full_name, email, phone, location, summary, skills, experience_json, education_json, certifications_json, created_at, updated_at)
             VALUES ('profile_local', 'local', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
            rusqlite::params![
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["name"].as_str().map(|s| s.to_string())),
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["email"].as_str().map(|s| s.to_string())),
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["phone"].as_str().map(|s| s.to_string())),
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["location"].as_str().map(|s| s.to_string())),
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["summary"].as_str().map(|s| s.to_string())),
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["skills"].as_array().map(|a| a.iter().filter_map(|s| s.as_str()).collect::<Vec<_>>().join(", "))),
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["experience"].as_array().map(|a| serde_json::to_string(a).unwrap_or_default())),
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["education"].as_array().map(|a| serde_json::to_string(a).unwrap_or_default())),
                serde_json::from_str::<serde_json::Value>(&json_clone)
                    .ok().and_then(|v| v["certifications"].as_array().map(|a| serde_json::to_string(a).unwrap_or_default())),
                now_clone,
            ],
        )?;

        Ok::<(), rusqlite::Error>(())
    })
    .await
    .map_err(|e| format!("DB interact failed: {}", e))?
    .map_err(|e| format!("DB error: {}", e))?;

    Ok(())
}