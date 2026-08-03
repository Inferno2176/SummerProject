use async_trait::async_trait;
use crate::db::error::{DbResult, DbError};
use crate::db::SettingRepository;
use crate::services::job::{JobSourceAdapter, DiscoveredJob, JobSearchQuery};
use reqwest::Client;
use std::sync::Arc;
use crate::db::DbPool;
use std::time::Duration;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct AdzunaResponse {
    results: Vec<AdzunaJob>,
}

#[derive(Deserialize, Debug)]
struct AdzunaJob {
    title: String,
    description: Option<String>,
    company: Option<AdzunaCompany>,
    location: Option<AdzunaLocation>,
    salary_min: Option<f64>,
    salary_max: Option<f64>,
    contract_type: Option<String>, // e.g. permanent, contract
    contract_time: Option<String>, // e.g. full_time, part_time
    created: Option<String>,       // ISO timestamp
    redirect_url: String,          // Apply URL
}

#[derive(Deserialize, Debug)]
struct AdzunaCompany {
    display_name: Option<String>,
}

#[derive(Deserialize, Debug)]
struct AdzunaLocation {
    display_name: Option<String>,
}

pub struct AdzunaAdapter {
    pool: Arc<DbPool>,
}

impl AdzunaAdapter {
    pub fn new(pool: Arc<DbPool>) -> Self {
        Self { pool }
    }

    /// Retrieve API credentials from environment variables, database settings, or fallback default
    async fn get_credentials(&self) -> (String, String) {
        // 1. Check environment variables first
        let app_id_env = std::env::var("ADZUNA_APP_ID").ok()
            .filter(|s| !s.trim().is_empty());
        let app_key_env = std::env::var("ADZUNA_APP_KEY").ok()
            .filter(|s| !s.trim().is_empty());

        if let (Some(id), Some(key)) = (app_id_env, app_key_env) {
            return (id, key);
        }

        // 2. Read from Database settings table
        let app_id_db = SettingRepository::get_string(&self.pool, "adzuna_app_id").await.ok()
            .filter(|s| !s.trim().is_empty());
        let app_key_db = SettingRepository::get_string(&self.pool, "adzuna_app_key").await.ok()
            .filter(|s| !s.trim().is_empty());

        if let (Some(id), Some(key)) = (app_id_db, app_key_db) {
            return (id, key);
        }

        // 3. Fallback default developer credentials
        (
            "468957de".to_string(),
            "7c00d75de70832590f63d0530445e1be".to_string(),
        )
    }

    /// Check if the searched location is outside India
    fn is_foreign_location(&self, location: &str) -> bool {
        let loc_lower = location.to_lowercase();
        // Common foreign names to ignore or flag
        let foreign_keywords = [
            "us", "usa", "united states", "uk", "london", "canada", "germany", "australia", 
            "singapore", "dubai", "europe", "america", "tokyo", "japan", "france", "paris"
        ];
        for kw in &foreign_keywords {
            if loc_lower == *kw || loc_lower.contains(&format!(" {}", kw)) || loc_lower.contains(&format!("{},", kw)) {
                return true;
            }
        }
        false
    }
}

#[async_trait]
impl JobSourceAdapter for AdzunaAdapter {
    fn name(&self) -> &'static str {
        "Adzuna"
    }

    async fn search(&self, query: &JobSearchQuery) -> DbResult<Vec<DiscoveredJob>> {
        // 1. Get credentials
        let (app_id, app_key) = self.get_credentials().await;
        if app_id.is_empty() || app_key.is_empty() {
            log::warn!("Adzuna API credentials are empty. Skipping search.");
            return Ok(Vec::new());
        }

        // 2. Handle page number
        let page = query.page.unwrap_or(1);

        // 3. Construct base URL (Always India endpoint)
        let base_url = format!("https://api.adzuna.com/v1/api/jobs/in/search/{}", page);
        let mut url = match reqwest::Url::parse(&base_url) {
            Ok(u) => u,
            Err(e) => return Err(DbError::QueryError(format!("Failed to parse Adzuna URL: {}", e))),
        };

        // 4. Build query parameters
        {
            let mut query_pairs = url.query_pairs_mut();
            query_pairs.append_pair("app_id", &app_id);
            query_pairs.append_pair("app_key", &app_key);
            query_pairs.append_pair("content-type", "application/json");

            // Filter: Job Title/Keywords
            let mut search_keywords = Vec::new();
            if let Some(title) = &query.title {
                if !title.trim().is_empty() {
                    search_keywords.push(title.trim().to_string());
                }
            }
            // Include skills in keyword search if no title is present
            if search_keywords.is_empty() {
                if let Some(skill) = query.skills.iter().find(|s| !s.trim().is_empty()) {
                    search_keywords.push(format!("{} developer", skill.trim()));
                }
            }
            // Fallback default
            if search_keywords.is_empty() {
                search_keywords.push("Software Engineer".to_string());
            }

            // Append internship keyword if requested
            if let Some(true) = query.internship {
                search_keywords.push("internship".to_string());
            }

            query_pairs.append_pair("what", &search_keywords.join(" "));

            // Filter: Location (India-only verification)
            if let Some(loc) = &query.location {
                if !loc.trim().is_empty() {
                    if self.is_foreign_location(loc) {
                        log::warn!(
                            "Location '{}' is outside India. hyrd. is India-only. Location filter ignored.", 
                            loc
                        );
                    } else {
                        query_pairs.append_pair("where", loc.trim());
                    }
                }
            }

            // Filter: Results per page
            let limit = query.results_per_page.unwrap_or(20);
            query_pairs.append_pair("results_per_page", &limit.to_string());

            // Filter: Salary Minimum & Maximum
            if let Some(sal_min) = query.salary_min {
                query_pairs.append_pair("salary_min", &sal_min.to_string());
            }
            if let Some(sal_max) = query.salary_max {
                query_pairs.append_pair("salary_max", &sal_max.to_string());
            }

            // Filter: Job Type (Full-time / Part-time)
            if let Some(jtype) = &query.job_type {
                let jt_lower = jtype.to_lowercase();
                if jt_lower.contains("full") {
                    query_pairs.append_pair("full_time", "1");
                } else if jt_lower.contains("part") {
                    query_pairs.append_pair("part_time", "1");
                }
            }

            // Filter: Contract Type (Permanent / Contract)
            if let Some(ctype) = &query.contract_type {
                let ct_lower = ctype.to_lowercase();
                if ct_lower.contains("permanent") {
                    query_pairs.append_pair("permanent", "1");
                } else if ct_lower.contains("contract") {
                    query_pairs.append_pair("contract", "1");
                }
            }

            // Filter: Sorting
            if let Some(sort) = &query.sort_by {
                let sort_lower = sort.to_lowercase();
                if sort_lower == "date" || sort_lower == "relevance" {
                    query_pairs.append_pair("sort_by", &sort_lower);
                }
            }
        }

        // 5. Build client with 10-second timeout
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|e| DbError::QueryError(format!("Failed to build Adzuna client: {}", e)))?;

        // 6. Request execution with retries
        let mut response = None;
        let mut retries = 0;
        let max_retries = 2;

        while retries <= max_retries {
            log::info!("Sending request to Adzuna API (attempt {}/{})...", retries + 1, max_retries + 1);
            match client.get(url.clone())
                .header("Accept", "application/json")
                .send()
                .await 
            {
                Ok(res) => {
                    if res.status().is_success() {
                        response = Some(res);
                        break;
                    } else if res.status().is_server_error() {
                        log::warn!("Adzuna server error ({}). Retrying...", res.status());
                    } else {
                        // Client error (4xx) - don't retry
                        return Err(DbError::QueryError(format!(
                            "Adzuna API returned HTTP error: {}", 
                            res.status()
                        )));
                    }
                }
                Err(e) => {
                    log::warn!("Adzuna request failed: {}. Retrying...", e);
                }
            }

            retries += 1;
            if retries <= max_retries {
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }

        // 7. Parse and map the response
        let res = match response {
            Some(r) => r,
            None => {
                log::error!("Adzuna API requests failed after {} retries. Returning empty list.", max_retries + 1);
                return Ok(Vec::new()); // Return empty list on complete failure instead of crashing
            }
        };

        let adzuna_data: AdzunaResponse = match res.json().await {
            Ok(data) => data,
            Err(e) => {
                log::error!("Failed to parse Adzuna response JSON: {}. Returning empty list.", e);
                return Ok(Vec::new());
            }
        };

        // 8. Map to DiscoveredJob structure
        let mut discovered_jobs = Vec::new();
        for job in adzuna_data.results {
            let company = job.company
                .and_then(|c| c.display_name)
                .unwrap_or_else(|| "Unknown Company".to_string());
            let location = job.location
                .and_then(|l| l.display_name);

            let job_type_label = match (job.contract_time.as_deref(), job.contract_type.as_deref()) {
                (Some(time), Some(ctype)) => Some(format!("{}, {}", time, ctype)),
                (Some(time), None) => Some(time.to_string()),
                (None, Some(ctype)) => Some(ctype.to_string()),
                (None, None) => None,
            };

            discovered_jobs.push(DiscoveredJob {
                title: job.title,
                company,
                location,
                source: "Adzuna".to_string(),
                source_url: job.redirect_url,
                description: job.description,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                job_type: job_type_label,
                posted_date: job.created,
            });
        }

        Ok(discovered_jobs)
    }
}
