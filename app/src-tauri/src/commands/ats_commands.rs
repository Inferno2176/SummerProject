use tauri::{AppHandle, Manager};
use crate::db::{DbPool, ResumeRepository, JobRepository, GeneratedDocumentRepository, GeneratedResume, GeneratedCoverLetter, ApplicationRepository, JobApplication};
use crate::services::ats::AtsGenerator;
use serde_json::json;

#[tauri::command]
pub async fn mark_job_as_applied(
    app: AppHandle,
    job_id: String,
    mut resume_id: Option<String>,
    mut cover_letter_id: Option<String>,
) -> Result<JobApplication, String> {
    let pool = app.state::<DbPool>();

    // 1. Get Job to get user_id and description
    let job = JobRepository::get_by_id(&pool, &job_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Job not found")?;

    // 2. If no resume_id provided, use default resume
    if resume_id.is_none() {
        if let Ok(Some(default_resume)) = ResumeRepository::get_default(&pool, &job.user_id).await {
            resume_id = Some(default_resume.id);
        }
    }

    // 3. Auto-generate ATS resume if missing
    let mut generated_resume_id: Option<String> = None;
    let mut generated_cover_letter_id: Option<String> = cover_letter_id.clone();

    if let Some(ref rid) = resume_id {
        let existing_generated = GeneratedDocumentRepository::list_resumes_by_job(&pool, &job_id)
            .await
            .unwrap_or_default();
        
        if let Some(latest) = existing_generated.first() {
            generated_resume_id = Some(latest.id.clone());
        } else if let Ok(gen) = generate_ats_resume(app.clone(), job_id.clone(), rid.clone()).await {
            generated_resume_id = Some(gen.id);
        }
    }

    // 4. Auto-generate Cover Letter if missing
    if let Some(ref rid) = resume_id {
        let existing_cl = GeneratedDocumentRepository::list_cover_letters_by_job(&pool, &job_id)
            .await
            .unwrap_or_default();
        
        if existing_cl.is_empty() {
            if let Some(latest) = existing_cl.first() {
                generated_cover_letter_id = Some(latest.id.clone());
                if cover_letter_id.is_none() {
                    cover_letter_id = Some(latest.id.clone());
                }
            } else if let Ok(gen) = generate_cover_letter(app.clone(), job_id.clone(), rid.clone()).await {
                generated_cover_letter_id = Some(gen.id.clone());
                cover_letter_id.get_or_insert(gen.id);
            }
        } else if let Some(latest) = existing_cl.first() {
            generated_cover_letter_id = Some(latest.id.clone());
        }
    }

    // 5. Update Job status
    JobRepository::update_status(&pool, &job_id, "applied")
        .await
        .map_err(|e| e.to_string())?;

    // 6. Create application record
    ApplicationRepository::create(
        &pool,
        &job.user_id,
        &job_id,
        resume_id,
        cover_letter_id,
        generated_resume_id,
        generated_cover_letter_id,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_list_applications(
    app: AppHandle,
    user_id: String,
) -> Result<Vec<JobApplication>, String> {
    let pool = app.state::<DbPool>();
    ApplicationRepository::list_by_user(&pool, &user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_get_application_by_job(
    app: AppHandle,
    job_id: String,
) -> Result<Option<JobApplication>, String> {
    let pool = app.state::<DbPool>();
    ApplicationRepository::get_by_job_id(&pool, &job_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_ats_resume(
    app: AppHandle,
    job_id: String,
    resume_id: String,
) -> Result<GeneratedResume, String> {
    let pool = app.state::<DbPool>();

    // 1. Get Job
    let job = JobRepository::get_by_id(&pool, &job_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Job not found")?;

    // 2. Get Resume
    let resume = ResumeRepository::get_by_id(&pool, &resume_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Resume not found")?;

    let master_json = resume.master_resume_json.ok_or("Resume has no master data")?;
    let job_desc = job.description.unwrap_or_else(|| "No description available".to_string());

    // 3. Generate using AI
    let model = "llama3.2:1b"; // Use fast model
    let optimized = AtsGenerator::generate_optimized_resume(&master_json, &job_desc, model)
        .await
        .map_err(|e| e.to_string())?;

    let optimized_summary = optimized.summary.clone();
    let optimized_skills = optimized.skills.clone();
    let optimized_experience_bullets = optimized.experience_bullets.clone();
    let ats_strengths = optimized.strengths.clone();
    let ats_weaknesses = optimized.weaknesses.clone();
    let ats_recommendations = optimized.recommendations.clone();
    let master_value = serde_json::from_str::<serde_json::Value>(&master_json)
        .unwrap_or_else(|_| json!({ "raw": master_json }));
    let generated_resume_json = json!({
        "source": "hyrd_ats",
        "job": {
            "id": job.id.clone(),
            "title": job.title.clone(),
            "company": job.company.clone(),
            "description": job_desc.clone()
        },
        "master_resume": master_value,
        "optimized": {
            "summary": optimized_summary,
            "skills": optimized_skills,
            "experience_bullets": optimized_experience_bullets,
            "ats_score": optimized.ats_score,
            "strengths": ats_strengths,
            "weaknesses": ats_weaknesses,
            "recommendations": ats_recommendations
        }
    });

    // 4. Store in DB
    let generated = GeneratedDocumentRepository::create_resume(
        &pool,
        &resume.user_id,
        &job_id,
        &resume_id,
        Some(job.title.clone()),
        Some(master_json),
        Some(generated_resume_json.to_string()),
        Some(optimized.ats_score),
        Some(optimized.strengths.join("\n")),
        Some(optimized.weaknesses.join("\n")),
        Some(optimized.recommendations.join("\n")),
        Some(generated_resume_json["optimized"]["summary"].as_str().unwrap_or_default().to_string()),
        Some(
            generated_resume_json["optimized"]["skills"]
                .as_array()
                .map(|skills| skills.iter().filter_map(|skill| skill.as_str()).collect::<Vec<_>>().join(", "))
                .unwrap_or_default()
        ),
        Some(generated_resume_json["optimized"]["experience_bullets"].to_string()),
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(generated)
}

#[tauri::command]
pub async fn generate_cover_letter(
    app: AppHandle,
    job_id: String,
    resume_id: String,
) -> Result<GeneratedCoverLetter, String> {
    let pool = app.state::<DbPool>();

    // 1. Get Job
    let job = JobRepository::get_by_id(&pool, &job_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Job not found")?;

    // 2. Get Resume
    let resume = ResumeRepository::get_by_id(&pool, &resume_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Resume not found")?;

    let master_json = resume.master_resume_json.ok_or("Resume has no master data")?;
    let job_desc = job.description.unwrap_or_else(|| "No description available".to_string());
    let company_name = job.company.clone();

    // 3. Generate using AI
    let model = "llama3.2:1b";
    let content = AtsGenerator::generate_cover_letter(&master_json, &job_desc, company_name.as_deref(), model)
        .await
        .map_err(|e| e.to_string())?;

    // 4. Store in DB
    let generated = GeneratedDocumentRepository::create_cover_letter(
        &pool,
        &resume.user_id,
        &job_id,
        Some(resume_id),
        Some(job.title),
        company_name,
        Some(master_json),
        &content,
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(generated)
}

#[tauri::command]
pub async fn db_list_generated_resumes(
    app: AppHandle,
    job_id: String,
) -> Result<Vec<GeneratedResume>, String> {
    let pool = app.state::<DbPool>();
    GeneratedDocumentRepository::list_resumes_by_job(&pool, &job_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_list_generated_cover_letters(
    app: AppHandle,
    job_id: String,
) -> Result<Vec<GeneratedCoverLetter>, String> {
    let pool = app.state::<DbPool>();
    GeneratedDocumentRepository::list_cover_letters_by_job(&pool, &job_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_list_all_generated_resumes(
    app: AppHandle,
    user_id: String,
) -> Result<Vec<GeneratedResume>, String> {
    let pool = app.state::<DbPool>();
    GeneratedDocumentRepository::list_all_resumes(&pool, &user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_list_all_generated_cover_letters(
    app: AppHandle,
    user_id: String,
) -> Result<Vec<GeneratedCoverLetter>, String> {
    let pool = app.state::<DbPool>();
    GeneratedDocumentRepository::list_all_cover_letters(&pool, &user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_delete_generated_resume(
    app: AppHandle,
    id: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    GeneratedDocumentRepository::delete_resume(&pool, &id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_delete_generated_cover_letter(
    app: AppHandle,
    id: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    GeneratedDocumentRepository::delete_cover_letter(&pool, &id)
        .await
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct AtsAnalysisResult {
    pub score: i32,
    pub feedback: Vec<String>,
    pub missing_keywords: Vec<String>,
}

#[tauri::command]
pub async fn analyze_ats_local(
    app: AppHandle,
    resume_id: String,
    job_description: String,
) -> Result<AtsAnalysisResult, String> {
    use crate::db::SettingRepository;
    use crate::types::{OllamaChatRequest, OllamaChatMessage, OllamaGenerationOptions};
    use reqwest::Client;

    let pool = app.state::<DbPool>();

    // 1. Get resume
    let resume = ResumeRepository::get_by_id(&pool, &resume_id)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or("Resume not found")?;

    // 2. Extract parsed content JSON
    let parsed_json = resume.parsed_content.as_deref().unwrap_or("{}");
    
    // Get active model
    let model = match SettingRepository::get_string(&pool, "selected_model").await {
        Ok(m) if !m.trim().is_empty() => m,
        _ => "llama3.2:1b".to_string(),
    };

    let client = Client::new();
    let url = "http://localhost:11434/api/chat";

    let system_prompt = r#"You are an ATS (Applicant Tracking System) optimizer. 
Compare the user's resume against the provided job description.
Determine the match score (0-100), key feedback/strengths (as bullet points), and missing keywords/skills.
Strictly return a JSON object with this exact structure:
{
  "score": 75,
  "feedback": ["Strong match for Python and machine learning.", "Needs to emphasize data visualization."],
  "missingKeywords": ["Tableau", "AWS", "Docker"]
}
Output ONLY the JSON object, no other text."#;

    let user_prompt = format!(
        "Resume JSON:\n{}\n\nJob Description:\n{}",
        parsed_json, job_description
    );

    let request = OllamaChatRequest {
        model,
        stream: false,
        messages: vec![
            OllamaChatMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            OllamaChatMessage {
                role: "user".to_string(),
                content: user_prompt,
            },
        ],
        options: OllamaGenerationOptions {
            temperature: 0.2,
            top_p: 0.9,
            repeat_penalty: 1.1,
            num_predict: 1000,
        },
    };

    let response = client.post(url)
        .json(&request)
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(result_val) = resp.json::<serde_json::Value>().await {
                if let Some(content) = result_val["message"]["content"].as_str() {
                    let json_str = if content.contains("```json") {
                        content.split("```json").nth(1).unwrap().split("```").next().unwrap().trim()
                    } else if content.contains("```") {
                        content.split("```").nth(1).unwrap().split("```").next().unwrap().trim()
                    } else {
                        content.trim()
                    };

                    let clean_json = json_str.replace("\\n", "\n").replace("\\\"", "\"");

                    if let Ok(parsed_res) = serde_json::from_str::<AtsAnalysisResult>(&clean_json) {
                        return Ok(parsed_res);
                    }
                }
            }
            log::warn!("Failed to parse Ollama JSON response. Falling back to local heuristics.");
        }
        _ => {
            log::warn!("Ollama is offline. Falling back to local heuristic keyword matching.");
        }
    }

    // Heuristic Fallback
    let mut resume_skills = Vec::new();
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&parsed_json) {
        if let Some(arr) = val["skills"].as_array() {
            resume_skills = arr.iter().filter_map(|s| s.as_str()).map(|s| s.to_lowercase()).collect();
        }
    }
    
    let jd_lower = job_description.to_lowercase();
    let mut matched = Vec::new();
    let mut missing = Vec::new();
    
    for skill in &resume_skills {
        if jd_lower.contains(skill) {
            matched.push(skill.clone());
        } else {
            missing.push(skill.clone());
        }
    }
    
    let score = if resume_skills.is_empty() {
        60
    } else {
        (matched.len() as f64 / resume_skills.len() as f64 * 100.0) as i32
    };
    
    Ok(AtsAnalysisResult {
        score,
        feedback: vec![
            format!("Matched {} core skills out of {}.", matched.len(), resume_skills.len()),
            "Please run Ollama locally for deep semantic analysis and custom recommendations.".to_string(),
        ],
        missing_keywords: missing.iter().take(5).map(|s| s.to_string()).collect(),
    })
}

#[tauri::command]
pub async fn optimize_resume_adhoc(
    app: AppHandle,
    resume_id: String,
    job_description: String,
) -> Result<GeneratedResume, String> {
    use crate::db::UserRepository;

    let pool = app.state::<DbPool>();

    // 1. Get current user
    let user = UserRepository::get_current_user(&pool).await.map_err(|e| e.to_string())?;

    // 2. Create dummy job for ad-hoc optimization
    let job = JobRepository::create(
        &pool,
        &user.id,
        "Custom Match",
        Some("Ad-hoc Optimizer".to_string()),
        None, // url
        Some(job_description.clone()),
        None, // location
        Some("hyrd_ats".to_string()), // source
        None, // source_url
        None, // match_score
        None, // matched_skills
        None, // missing_skills
        None, // experience_match
        None, // title_match
        None, // posted_date
        Some("recommended".to_string()), // status
    )
    .await
    .map_err(|e| e.to_string())?;

    let job_id = job.id.clone();

    // 3. Generate ATS resume
    let resume = ResumeRepository::get_by_id(&pool, &resume_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Resume not found")?;

    let master_json = resume.master_resume_json.ok_or("Resume has no master data")?;
    
    // Get active model
    let model = match crate::db::SettingRepository::get_string(&pool, "selected_model").await {
        Ok(m) if !m.trim().is_empty() => m,
        _ => "llama3.2:1b".to_string(),
    };

    let optimized = AtsGenerator::generate_optimized_resume(&master_json, &job_description, &model)
        .await
        .map_err(|e| e.to_string())?;

    let optimized_summary = optimized.summary.clone();
    let optimized_skills = optimized.skills.clone();
    let optimized_experience_bullets = optimized.experience_bullets.clone();
    let ats_strengths = optimized.strengths.clone();
    let ats_weaknesses = optimized.weaknesses.clone();
    let ats_recommendations = optimized.recommendations.clone();
    let master_value = serde_json::from_str::<serde_json::Value>(&master_json)
        .unwrap_or_else(|_| json!({ "raw": master_json }));

    let generated_resume_json = json!({
        "source": "hyrd_ats",
        "job": {
            "id": job.id.clone(),
            "title": job.title.clone(),
            "company": job.company.clone(),
            "description": job_description.clone()
        },
        "master_resume": master_value,
        "optimized": {
            "summary": optimized_summary,
            "skills": optimized_skills,
            "experience_bullets": optimized_experience_bullets,
            "ats_score": optimized.ats_score,
            "strengths": ats_strengths,
            "weaknesses": ats_weaknesses,
            "recommendations": ats_recommendations
        }
    });

    // 4. Save to DB
    let gen = GeneratedDocumentRepository::create_resume(
        &pool,
        &user.id,
        &job_id,
        &resume_id,
        Some(job.title.clone()),
        Some(master_json),
        Some(generated_resume_json.to_string()),
        Some(optimized.ats_score),
        Some(optimized.strengths.join("\n")),
        Some(optimized.weaknesses.join("\n")),
        Some(optimized.recommendations.join("\n")),
        Some(generated_resume_json["optimized"]["summary"].as_str().unwrap_or_default().to_string()),
        Some(
            generated_resume_json["optimized"]["skills"]
                .as_array()
                .map(|skills| skills.iter().filter_map(|skill| skill.as_str()).collect::<Vec<_>>().join(", "))
                .unwrap_or_default()
        ),
        Some(generated_resume_json["optimized"]["experience_bullets"].to_string()),
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(gen)
}
