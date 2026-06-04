use async_trait::async_trait;
use crate::db::error::DbResult;
use crate::services::job::{JobSourceAdapter, DiscoveredJob, JobSearchQuery};

pub struct IndeedAdapter;

#[async_trait]
impl JobSourceAdapter for IndeedAdapter {
    fn name(&self) -> &'static str { "Indeed" }
    
    async fn search(&self, query: &JobSearchQuery) -> DbResult<Vec<DiscoveredJob>> {
        Ok(vec![
            DiscoveredJob {
                title: format!("Lead {} Developer", query.title.as_deref().unwrap_or("Software")),
                company: "Growth Startup".to_string(),
                location: query.location.clone().or(Some("New York, NY".to_string())),
                source: self.name().to_string(),
                source_url: "https://www.indeed.com/sample-2".to_string(),
                description: Some("Extracted description from Indeed...".to_string()),
                salary_min: Some(140.0),
                salary_max: Some(220.0),
                job_type: Some("Full-time".to_string()),
                posted_date: Some("2026-06-03".to_string()),
            }
        ])
    }
}
