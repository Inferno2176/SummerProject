use serde::{Deserialize, Serialize};
use super::DiscoveredJob;
use crate::services::resume::parser::ParsedResume;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobMatchResult {
    pub match_score: f64,
    pub matched_skills: Vec<String>,
    pub missing_skills: Vec<String>,
    pub experience_match: bool,
    pub title_match: bool,
}

pub struct JobMatchingEngine;

impl JobMatchingEngine {
    pub fn calculate_match(job: &DiscoveredJob, resume: &ParsedResume) -> JobMatchResult {
        let mut score = 0.0;
        let mut matched_skills = Vec::new();
        let mut missing_skills = Vec::new();
        
        // 1. Title Match (30%)
        let title_match = if let Some(resume_name) = &resume.name {
             // This is a simplified check. A better one would compare previous job titles.
             job.title.to_lowercase().contains(&resume_name.to_lowercase())
        } else {
            false
        };
        if title_match { score += 30.0; }

        // 2. Skills Match (50%)
        let job_desc = job.description.as_deref().unwrap_or("").to_lowercase();
        for skill in &resume.skills {
            if job_desc.contains(&skill.to_lowercase()) {
                matched_skills.push(skill.clone());
            } else {
                missing_skills.push(skill.clone());
            }
        }
        
        if !resume.skills.is_empty() {
            let skill_ratio = matched_skills.len() as f64 / resume.skills.len() as f64;
            score += skill_ratio * 50.0;
        }

        // 3. Experience Match (20%)
        // Mock logic: assume match for now
        let experience_match = true;
        if experience_match { score += 20.0; }

        JobMatchResult {
            match_score: score,
            matched_skills,
            missing_skills,
            experience_match,
            title_match,
        }
    }
}
