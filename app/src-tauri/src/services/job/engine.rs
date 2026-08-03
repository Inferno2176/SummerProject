use crate::db::error::{DbError, DbResult};
use crate::db::{JobRepository, DbPool, ResumeRepository, SettingRepository};
use super::{JobSourceAdapter, JobSearchQuery};
use super::adapters::{LinkedIn, Indeed, Greenhouse, AdzunaAdapter};
use super::matching::JobMatchingEngine;
use std::sync::Arc;

pub struct JobDiscoveryEngine {
    adapters: Vec<Box<dyn JobSourceAdapter>>,
    pool: Arc<DbPool>,
}

impl JobDiscoveryEngine {
    pub fn new(pool: Arc<DbPool>) -> Self {
        Self {
            adapters: vec![
                Box::new(LinkedIn),
                Box::new(Indeed),
                Box::new(Greenhouse),
                Box::new(AdzunaAdapter::new(pool.clone())),
            ],
            pool,
        }
    }

    pub async fn fetch_and_match(&self, user_id: &str, query: &JobSearchQuery) -> DbResult<usize> {
        let mut all_discovered = Vec::new();
        let mut adapter_errors = Vec::new();
        
        // Check if Adzuna is configured and enabled
        let adzuna_app_id = std::env::var("ADZUNA_APP_ID").ok()
            .filter(|s| !s.trim().is_empty());
        let adzuna_app_key = std::env::var("ADZUNA_APP_KEY").ok()
            .filter(|s| !s.trim().is_empty());

        let has_env_creds = adzuna_app_id.is_some() && adzuna_app_key.is_some();

        let adzuna_enabled = if has_env_creds {
            true
        } else {
            let db_id = SettingRepository::get_string(&self.pool, "adzuna_app_id").await.ok()
                .filter(|s| !s.trim().is_empty());
            let db_key = SettingRepository::get_string(&self.pool, "adzuna_app_key").await.ok()
                .filter(|s| !s.trim().is_empty());
            db_id.is_some() && db_key.is_some()
        };

        let mut adzuna_adapter_opt = None;
        let mut other_adapters = Vec::new();
        for adapter in &self.adapters {
            if adapter.name() == "Adzuna" {
                adzuna_adapter_opt = Some(adapter);
            } else {
                other_adapters.push(adapter);
            }
        }

        let mut adzuna_succeeded_with_jobs = false;

        // 1. Fetch from Adzuna as primary if enabled
        if adzuna_enabled {
            if let Some(adzuna_adapter) = adzuna_adapter_opt {
                log::info!("Adzuna is enabled. Running Adzuna search as primary...");
                match adzuna_adapter.search(query).await {
                    Ok(jobs) => {
                        log::info!("Adzuna returned {} jobs", jobs.len());
                        if !jobs.is_empty() {
                            all_discovered.extend(jobs);
                            adzuna_succeeded_with_jobs = true;
                        }
                    }
                    Err(error) => {
                        log::warn!("Adzuna job search failed: {}", error);
                        adapter_errors.push(format!("Adzuna: {}", error));
                    }
                }
            }
        }

        // 2. Fetch from other providers as fallback if Adzuna returned no jobs or was disabled
        if !adzuna_succeeded_with_jobs {
            log::info!("Adzuna not used or returned no jobs. Running other providers as fallback...");
            for adapter in other_adapters {
                match adapter.search(query).await {
                    Ok(jobs) => {
                        log::info!("{} returned {} discovered jobs", adapter.name(), jobs.len());
                        all_discovered.extend(jobs);
                    }
                    Err(error) => {
                        log::warn!("{} job search failed: {}", adapter.name(), error);
                        adapter_errors.push(format!("{}: {}", adapter.name(), error));
                    }
                }
            }
        }

        if all_discovered.is_empty() && !adapter_errors.is_empty() {
            return Err(DbError::QueryError(format!(
                "All job sources failed. {}",
                adapter_errors.join("; ")
            )));
        }

        // 2. Get master resume for matching
        let default_resume = ResumeRepository::get_default(&self.pool, user_id).await?;
        let parsed_resume = if let Some(resume) = default_resume {
            if let Some(json) = resume.master_resume_json.as_deref() {
                 let master: serde_json::Value = serde_json::from_str(json).unwrap_or_default();
                 serde_json::from_value(master["profile"].clone()).ok()
            } else {
                None
            }
        } else {
            None
        };

        // 3. Process each job (Matching & Deduplication & Storage)
        let mut new_jobs_count = 0;
        for discovered in all_discovered {
            // Requirement 4: Use URL deduplication as the source of truth.
            // Check for duplicates
            if let Ok(Some(_)) = JobRepository::get_by_url(&self.pool, &discovered.source_url).await {
                continue; // Skip already existing URL
            }

            // Deduplicate by Title, Company, Location
            if let Ok(Some(_)) = JobRepository::check_exists(
                &self.pool,
                &discovered.title,
                &discovered.company,
                discovered.location.as_deref().unwrap_or(""),
            )
            .await
            {
                continue; // Skip if same role at same company already exists
            }

            // Requirement 1 & 7: Do NOT reject jobs because metadata (posted_date, company, etc.) is missing.
            // We use resume matching as the primary quality filter.

            let match_result = if let Some(resume) = &parsed_resume {
                Some(JobMatchingEngine::calculate_match(&discovered, resume))
            } else {
                None
            };

            // Store in DB
            JobRepository::create(
                &self.pool,
                user_id,
                &discovered.title,
                Some(discovered.company),
                Some(discovered.source_url.clone()),
                discovered.description,
                discovered.location,
                Some(discovered.source),
                Some(discovered.source_url),
                match_result.as_ref().map(|m| m.match_score),
                match_result.as_ref().map(|m| m.matched_skills.join(",")),
                match_result.as_ref().map(|m| m.missing_skills.join(",")),
                match_result.as_ref().map(|m| m.experience_match),
                match_result.as_ref().map(|m| m.title_match),
                discovered.posted_date.clone(),
                Some("recommended".to_string()),
            ).await?;

            new_jobs_count += 1;
        }

        Ok(new_jobs_count)
    }
}
