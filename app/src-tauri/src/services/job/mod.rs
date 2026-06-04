use serde::{Deserialize, Serialize};
use async_trait::async_trait;
use crate::db::error::DbResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredJob {
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    pub source: String,
    pub source_url: String,
    pub description: Option<String>,
    pub salary_min: Option<f64>,
    pub salary_max: Option<f64>,
    pub job_type: Option<String>,
    pub posted_date: Option<String>,
}

#[async_trait]
pub trait JobSourceAdapter: Send + Sync {
    fn name(&self) -> &'static str;
    async fn search(&self, query: &JobSearchQuery) -> DbResult<Vec<DiscoveredJob>>;
}

#[derive(Debug, Clone)]
pub struct JobSearchQuery {
    pub title: Option<String>,
    pub location: Option<String>,
    pub skills: Vec<String>,
    pub experience_years: Option<f32>,
    pub remote: bool,
}

pub mod adapters;
pub mod matching;
pub mod engine;
pub mod scheduler;

pub use engine::JobDiscoveryEngine;
pub use scheduler::JobScheduler;
