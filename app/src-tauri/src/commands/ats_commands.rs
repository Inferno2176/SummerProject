use tauri::{AppHandle, Manager};
use crate::db::{DbPool, ResumeRepository, JobRepository, GeneratedDocumentRepository, GeneratedResume, GeneratedCoverLetter, ApplicationRepository, JobApplication};
use crate::services::ats::AtsGenerator;

#[tauri::command]
pub async fn mark_job_as_applied(
    app: AppHandle,
    job_id: String,
    resume_id: Option<String>,
    cover_letter_id: Option<String>,
) -> Result<JobApplication, String> {
    let pool = app.state::<DbPool>();

    // 1. Update Job status
    JobRepository::update_status(&pool, &job_id, "applied")
        .await
        .map_err(|e| e.to_string())?;

    // 2. Get Job to get user_id
    let job = JobRepository::get_by_id(&pool, &job_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Job not found")?;

    // 3. Create application record
    ApplicationRepository::create(
        &pool,
        &job.user_id,
        &job_id,
        resume_id,
        cover_letter_id,
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
    let job_desc = job.description.ok_or("Job has no description")?;

    // 3. Generate using AI
    let model = "llama3.2:1b"; // Use fast model
    let optimized = AtsGenerator::generate_optimized_resume(&master_json, &job_desc, model)
        .await
        .map_err(|e| e.to_string())?;

    // 4. Store in DB
    let generated = GeneratedDocumentRepository::create_resume(
        &pool,
        &resume.user_id,
        &job_id,
        &resume_id,
        Some(optimized.summary),
        Some(optimized.skills.join(", ")),
        Some(serde_json::to_string(&optimized.experience_bullets).unwrap_or_default()),
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
    let job_desc = job.description.ok_or("Job has no description")?;

    // 3. Generate using AI
    let model = "llama3.2:1b";
    let content = AtsGenerator::generate_cover_letter(&master_json, &job_desc, model)
        .await
        .map_err(|e| e.to_string())?;

    // 4. Store in DB
    let generated = GeneratedDocumentRepository::create_cover_letter(
        &pool,
        &resume.user_id,
        &job_id,
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
