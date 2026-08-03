use serde::{Deserialize, Serialize};
use crate::db::error::{DbError, DbResult};
use crate::types::{OllamaChatRequest, OllamaChatMessage, OllamaGenerationOptions};
use reqwest::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkExperience {
    pub title: Option<String>,
    pub company: Option<String>,
    pub location: Option<String>,
    pub duration: Option<String>,
    pub description: Option<String>,
    #[serde(default)]
    pub bullets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Education {
    pub degree: Option<String>,
    pub institution: Option<String>,
    pub location: Option<String>,
    pub year: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: Option<String>,
    pub description: Option<String>,
    pub technologies: Vec<String>,
    pub link: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedResume {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub location: Option<String>,
    pub summary: Option<String>,
    #[serde(default)]
    pub skills: Vec<String>,
    #[serde(default)]
    pub experience: Vec<WorkExperience>,
    #[serde(default)]
    pub education: Vec<Education>,
    #[serde(default)]
    pub certifications: Vec<String>,
    #[serde(default)]
    pub projects: Vec<Project>,
    #[serde(default)]
    pub languages: Vec<String>,
}

use regex::Regex;

pub fn parse_resume_text_regex(text: &str) -> ParsedResume {
    let mut parsed = ParsedResume {
        name: None,
        email: None,
        phone: None,
        location: None,
        summary: None,
        skills: Vec::new(),
        experience: Vec::new(),
        education: Vec::new(),
        certifications: Vec::new(),
        projects: Vec::new(),
        languages: Vec::new(),
    };

    // 1. Extract Email
    let email_re = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap();
    parsed.email = email_re.find(text).map(|m| m.as_str().to_string());

    // 2. Extract Phone
    let phone_re = Regex::new(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}").unwrap();
    parsed.phone = phone_re.find(text).map(|m| m.as_str().to_string());

    // 3. Extract Name (Usually at the top)
    let lines: Vec<&str> = text.lines().filter(|l| !l.trim().is_empty()).collect();
    if !lines.is_empty() {
        parsed.name = Some(lines[0].trim().to_string());
    }

    // 4. Extract Skills (Look for "Skills" section)
    let skills_re = Regex::new(r"(?i)skills:?\s*([\s\S]+?)(?:\n\n|\n[A-Z][a-z]+|$)").unwrap();
    if let Some(caps) = skills_re.captures(text) {
        let skills_text = caps.get(1).map_or("", |m| m.as_str());
        parsed.skills = skills_text
            .split(&[',', '\n', '•', '|'][..])
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && s.len() < 50)
            .collect();
    }

    // 5. Extract Summary
    let summary_re = Regex::new(r"(?i)(?:summary|professional profile|about me):?\s*([\s\S]+?)(?:\n\n|\n[A-Z][a-z]+|$)").unwrap();
    if let Some(caps) = summary_re.captures(text) {
        parsed.summary = Some(caps.get(1).map_or("", |m| m.as_str().trim()).to_string());
    }

    // 6. Basic Experience Extraction
    let exp_re = Regex::new(r"(?i)(?:experience|work history|employment|professional history):?\s*([\s\S]+?)(?:\n{2,}(?i)\b(?:education|skills|certifications|projects|languages)\b|$)").unwrap();
    if let Some(caps) = exp_re.captures(text) {
        let exp_text = caps.get(1).map_or("", |m| m.as_str().trim());
        let mut current_exp: Option<WorkExperience> = None;
        for line in exp_text.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() { continue; }
            
            // Check if line represents a section boundary
            let lower_trimmed = trimmed.to_lowercase();
            if lower_trimmed.starts_with("education") || lower_trimmed.starts_with("skills") || lower_trimmed.starts_with("certifications") || lower_trimmed.starts_with("projects") {
                break;
            }
            
            if trimmed.starts_with('•') || trimmed.starts_with('-') || trimmed.starts_with('*') {
                if let Some(ref mut exp) = current_exp {
                    exp.bullets.push(trimmed.trim_start_matches(['•', '-', '*', ' ']).trim().to_string());
                }
            } else {
                if let Some(exp) = current_exp.take() {
                    parsed.experience.push(exp);
                }
                
                let parts: Vec<&str> = trimmed.split(&['|', '@', ','][..]).collect();
                let title = Some(parts[0].trim().to_string());
                let company = parts.get(1).map(|c| c.trim().to_string());
                
                current_exp = Some(WorkExperience {
                    title,
                    company,
                    location: None,
                    duration: Some("Present".to_string()),
                    description: Some(trimmed.to_string()),
                    bullets: Vec::new(),
                });
            }
        }
        if let Some(exp) = current_exp {
            parsed.experience.push(exp);
        }
    }

    // 7. Basic Education Extraction
    let edu_re = Regex::new(r"(?i)(?:education|academic profile|qualification|university):?\s*([\s\S]+?)(?:\n{2,}(?i)\b(?:experience|skills|certifications|projects|languages)\b|$)").unwrap();
    if let Some(caps) = edu_re.captures(text) {
        let edu_text = caps.get(1).map_or("", |m| m.as_str().trim());
        for line in edu_text.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() { continue; }
            
            let lower_trimmed = trimmed.to_lowercase();
            if lower_trimmed.starts_with("experience") || lower_trimmed.starts_with("skills") || lower_trimmed.starts_with("projects") {
                break;
            }
            
            let degree_keywords = ["bachelor", "master", "doctor", "diploma", "b.tech", "m.tech", "b.e", "b.sc", "m.sc", "phd", "bba", "mba", "bsc", "msc", "ph.d."];
            let is_degree = degree_keywords.iter().any(|&kw| lower_trimmed.contains(kw));
            
            if is_degree || parsed.education.is_empty() {
                let parts: Vec<&str> = trimmed.split(&['|', ',', '-'][..]).collect();
                let degree = Some(parts[0].trim().to_string());
                let institution = parts.get(1).map(|i| i.trim().to_string());
                
                let yr_re = Regex::new(r"\b(19|20)\d{2}\b").unwrap();
                let year = yr_re.find(trimmed).map(|m| m.as_str().to_string());
                
                parsed.education.push(Education {
                    degree,
                    institution,
                    location: None,
                    year: year.or(Some("Graduated".to_string())),
                });
            }
        }
    }

    parsed
}

pub async fn parse_resume_text(text: &str, model: &str) -> DbResult<ParsedResume> {
    let client = Client::new();
    let url = "http://localhost:11434/api/chat";

    let system_prompt = r#"You are a professional resume parser. 
Extract information from the provided resume text into a valid JSON format.
Strictly follow this structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, Country",
  "summary": "Professional summary",
  "skills": ["Skill 1", "Skill 2"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "duration": "Dates",
      "description": "Short description",
      "bullets": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "location": "Location",
      "year": "Year"
    }
  ],
  "certifications": ["Cert 1", "Cert 2"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Description",
      "technologies": ["Tech 1"],
      "link": "URL"
    }
  ],
  "languages": ["Language 1"]
}
If any field is missing, use null or an empty array. Output ONLY the JSON object, no other text."#;

    let request = OllamaChatRequest {
        model: model.to_string(),
        stream: false,
        messages: vec![
            OllamaChatMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            OllamaChatMessage {
                role: "user".to_string(),
                content: text.to_string(),
            },
        ],
        options: OllamaGenerationOptions {
            temperature: 0.1,
            top_p: 0.9,
            repeat_penalty: 1.1,
            num_predict: 2000,
        },
    };

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

    // Extract JSON from potential markdown blocks
    let json_str = if content.contains("```json") {
        content.split("```json").nth(1).unwrap().split("```").next().unwrap().trim()
    } else if content.contains("```") {
        content.split("```").nth(1).unwrap().split("```").next().unwrap().trim()
    } else {
        content.trim()
    };

    let parsed: ParsedResume = serde_json::from_str(json_str)
        .map_err(|e| DbError::QueryError(format!("Failed to parse resume JSON: {}. Content was: {}", e, json_str)))?;

    Ok(parsed)
}
