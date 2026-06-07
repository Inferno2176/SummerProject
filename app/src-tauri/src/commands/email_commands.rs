use tauri::AppHandle;
use tauri::Manager;
use crate::db::{DbPool, Email, EmailRepository, UserRepository, ResumeRepository};
use reqwest::Client;
use serde_json::json;

#[tauri::command]
pub async fn db_list_emails(
    app: AppHandle,
) -> Result<Vec<Email>, String> {
    let pool = app.state::<DbPool>();
    
    let user = match UserRepository::get_by_email(&pool, "localuser@careerforges.local").await {
        Ok(Some(u)) => u,
        _ => return Err("Local user not found".to_string()),
    };

    let emails = EmailRepository::list_by_user(&pool, &user.id)
        .await
        .map_err(|e| e.to_string())?;

    // Seed if empty
    if emails.is_empty() {
        seed_emails(&pool, &user.id).await.map_err(|e| e.to_string())?;
        return EmailRepository::list_by_user(&pool, &user.id)
            .await
            .map_err(|e| e.to_string());
    }

    Ok(emails)
}

async fn seed_emails(pool: &DbPool, user_id: &str) -> Result<(), crate::db::error::DbError> {
    let seeds = [
        ("recruiter@google.com", "Google", "Your application for Senior Software Engineer", "Hi! We'd love to chat about your background. Are you free this Thursday?"),
        ("hr@stripe.com", "Stripe", "Next steps: Interview with Stripe", "Hello, we've reviewed your resume and are impressed. Let's schedule a technical screening."),
        ("talent@netflix.com", "Netflix", "Regarding your interest in Netflix", "Hi there, thank you for applying. We are moving forward with other candidates at this time, but we'll keep your resume on file."),
    ];

    for (sender, _company, subject, body) in seeds {
        EmailRepository::create(
            pool,
            user_id,
            sender,
            "localuser@careerforges.local",
            Some(subject.to_string()),
            Some(body.to_string()),
            true,
            None,
        ).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn db_mark_email_as_read(
    app: AppHandle,
    id: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    EmailRepository::mark_as_read(&pool, &id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn db_delete_email(
    app: AppHandle,
    id: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    EmailRepository::delete(&pool, &id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_email_reply(
    app: AppHandle,
    email_id: String,
) -> Result<String, String> {
    let pool = app.state::<DbPool>();
    
    let email = EmailRepository::get_by_id(&pool, &email_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Email not found")?;

    let user = match UserRepository::get_by_email(&pool, "localuser@careerforges.local").await {
        Ok(Some(u)) => u,
        _ => return Err("Local user not found".to_string()),
    };

    // Try to get default resume for context
    let resume_context = if let Ok(Some(resume)) = ResumeRepository::get_default(&pool, &user.id).await {
        resume.master_resume_json.unwrap_or_default()
    } else {
        "No resume context available.".to_string()
    };

    let model = "llama3.2:1b";
    let system_prompt = "You are a professional career assistant. Draft a polite, concise email reply to a recruiter based on the incoming email and the candidate's resume context. Output ONLY the email body text.";
    let user_prompt = format!(
        "Candidate Resume: {}\n\nIncoming Email from {}:\nSubject: {}\nBody: {}",
        resume_context,
        email.sender,
        email.subject.as_deref().unwrap_or("No Subject"),
        email.body.as_deref().unwrap_or("No Body")
    );

    let client = Client::new();
    let url = "http://localhost:11434/api/chat";

    let request = json!({
        "model": model,
        "stream": false,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ]
    });

    let reply = match client.post(url).json(&request).send().await {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(result) = resp.json::<serde_json::Value>().await {
                result["message"]["content"].as_str().unwrap_or("").to_string()
            } else {
                fallback_reply(&email)
            }
        }
        _ => fallback_reply(&email)
    };

    EmailRepository::update_suggested_reply(&pool, &email_id, &reply)
        .await
        .map_err(|e| e.to_string())?;

    Ok(reply)
}

fn fallback_reply(email: &Email) -> String {
    format!(
        "Dear {},\n\nThank you for your email regarding \"{}\". I am very interested in this opportunity and would appreciate the chance to discuss how my background aligns with your needs.\n\nPlease let me know if you need any further information from my side.\n\nBest regards,\nLocal User",
        email.sender,
        email.subject.as_deref().unwrap_or("the position")
    )
}
