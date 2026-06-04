use async_trait::async_trait;
use crate::db::error::DbResult;
use crate::services::job::{JobSourceAdapter, DiscoveredJob, JobSearchQuery};

pub struct GreenhouseAdapter;

#[async_trait]
impl JobSourceAdapter for GreenhouseAdapter {
    fn name(&self) -> &'static str { "Greenhouse" }
    
    async fn search(&self, query: &JobSearchQuery) -> DbResult<Vec<DiscoveredJob>> {
        Ok(vec![
            DiscoveredJob {
                title: format!("{} Architect", query.title.as_deref().unwrap_or("Software")),
                company: "Unicorn Inc".to_string(),
                location: query.location.clone().or(Some("San Francisco, CA".to_string())),
                source: self.name().to_string(),
                source_url: "https://boards.greenhouse.io/unicorn/jobs/sample-3".to_string(),
                description: Some("Extracted description from Greenhouse...".to_string()),
                salary_min: Some(180.0),
                salary_max: Some(280.0),
                job_type: Some("Full-time".to_string()),
                posted_date: Some("2026-06-03".to_string()),
            }
        ])
    }
}
