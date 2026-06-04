use serde::{Deserialize, Serialize};
use crate::db::error::{DbError, DbResult};
use reqwest::Client;
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
pub struct OptimizedResumeContent {
    pub summary: String,
    pub skills: Vec<String>,
    pub experience_bullets: Vec<String>,
}

pub struct AtsGenerator;

impl AtsGenerator {
    pub async fn generate_optimized_resume(
        master_resume_json: &str,
        job_description: &str,
        model: &str,
    ) -> DbResult<OptimizedResumeContent> {
        let system_prompt = r#"
            You are an expert ATS (Applicant Tracking System) optimizer. 
            Your goal is to rewrite specific parts of a resume to better match a job description while remaining truthful.
            
            Input:
            1. Master Resume JSON (containing professional profile, skills, and experience)
            2. Job Description
            
            Output:
            Return a JSON object with:
            - "summary": A 3-4 sentence professional summary optimized for the job.
            - "skills": A list of relevant skills from the master resume that match the job description.
            - "experience_bullets": A list of 5-8 optimized achievement bullets based on the master resume's experience that highlight relevant accomplishments for this specific job.
            
            Format your response as valid JSON only.
        "#;

        let user_prompt = format!(
            "Master Resume: {}\n\nJob Description: {}",
            master_resume_json, job_description
        );

        let client = Client::new();
        let url = "http://localhost:11434/api/chat";

        let request = json!({
            "model": model,
            "stream": false,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "format": "json"
        });

        let response = client.post(url)
            .json(&request)
            .send()
            .await
            .map_err(|e| DbError::QueryError(format!("Failed to call Ollama: {}", e)))?;

        let result: serde_json::Value = response.json()
            .await
            .map_err(|e| DbError::QueryError(format!("Failed to parse Ollama response: {}", e)))?;

        let content = result["message"]["content"].as_str()
            .ok_or_else(|| DbError::QueryError("No content in Ollama response".into()))?;

        let optimized: OptimizedResumeContent = serde_json::from_str(content)
            .map_err(|e| DbError::QueryError(format!("Failed to parse optimized content JSON: {}. Content was: {}", e, content)))?;

        Ok(optimized)
    }

    pub async fn generate_cover_letter(
        master_resume_json: &str,
        job_description: &str,
        model: &str,
    ) -> DbResult<String> {
        let system_prompt = r#"
            You are an expert career coach and cover letter writer.
            Your goal is to write a compelling, professional cover letter that connects a candidate's experience to a specific job description.
            
            Input:
            1. Master Resume JSON
            2. Job Description
            
            Output:
            A professional cover letter (text only, no markdown formatting like bold/italics unless necessary for headers).
            Keep it under 400 words. Focus on how the candidate's specific skills and achievements solve the company's problems mentioned in the job description.
        "#;

        let user_prompt = format!(
            "Master Resume: {}\n\nJob Description: {}",
            master_resume_json, job_description
        );

        let client = Client::new();
        let url = "http://localhost:11434/api/chat";

        let request = json!({
            "model": model,
            "stream": false,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        });

        let response = client.post(url)
            .json(&request)
            .send()
            .await
            .map_err(|e| DbError::QueryError(format!("Failed to call Ollama: {}", e)))?;

        let result: serde_json::Value = response.json()
            .await
            .map_err(|e| DbError::QueryError(format!("Failed to parse Ollama response: {}", e)))?;

        let content = result["message"]["content"].as_str()
            .ok_or_else(|| DbError::QueryError("No content in Ollama response".into()))?
            .to_string();

        Ok(content)
    }
}
