use std::sync::Arc;
use tokio::time::{interval, Duration};
use tauri::{AppHandle, Emitter};
use crate::db::{DbPool, SettingRepository, UserRepository};
use super::{JobDiscoveryEngine, JobSearchQuery};
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchedulerStatus {
    pub enabled: bool,
    pub frequency_mins: u64,
    pub last_run: Option<String>,
    pub next_run: Option<String>,
    pub last_count: usize,
}

pub struct JobScheduler {
    pool: Arc<DbPool>,
    app_handle: AppHandle,
}

impl JobScheduler {
    pub fn new(pool: Arc<DbPool>, app_handle: AppHandle) -> Self {
        Self { pool, app_handle }
    }

    pub async fn start(self) {
        let mut interval_timer = interval(Duration::from_secs(60)); // Check every minute

        loop {
            interval_timer.tick().await;
            
            if let Err(e) = self.tick().await {
                log::error!("Scheduler tick error: {}", e);
            }
        }
    }

    async fn tick(&self) -> Result<(), String> {
        let enabled = SettingRepository::get_bool(&self.pool, "job_scheduler_enabled")
            .await
            .unwrap_or(false);

        if !enabled {
            return Ok(());
        }

        let frequency_mins = SettingRepository::get_number(&self.pool, "job_scheduler_frequency")
            .await
            .unwrap_or(60.0) as u64;

        let last_run_str = SettingRepository::get_string(&self.pool, "job_scheduler_last_run")
            .await
            .ok();

        let should_run = if let Some(last_run) = last_run_str.as_deref() {
            if let Ok(last_run_dt) = chrono::DateTime::parse_from_rfc3339(last_run) {
                let now = Utc::now();
                let diff = now.signed_duration_since(last_run_dt.with_timezone(&Utc));
                diff.num_minutes() >= frequency_mins as i64
            } else {
                true
            }
        } else {
            true
        };

        if should_run {
            self.run_now().await?;
        }

        // Emit status update to frontend
        self.emit_status().await;

        Ok(())
    }

    pub async fn run_now(&self) -> Result<usize, String> {
        log::info!("Scheduler: Starting background job fetch...");
        
        let engine = JobDiscoveryEngine::new(self.pool.clone());
        
        // Get default user
        let user = match UserRepository::get_by_email(&self.pool, "localuser@careerforges.local").await {
            Ok(Some(u)) => u,
            _ => return Err("Local user not found".to_string()),
        };

        let query = JobSearchQuery {
            title: None,
            location: None,
            skills: vec![],
            experience_years: None,
            remote: false,
        };

        let count = engine.fetch_and_match(&user.id, &query)
            .await
            .map_err(|e| e.to_string())?;

        if count > 0 {
            let _ = self.app_handle.emit("new-jobs-discovered", count);
        }

        let now = Utc::now().to_rfc3339();
        
        // Update persistence
        let _ = SettingRepository::set(&self.pool, "job_scheduler_last_run", &now).await;
        let _ = SettingRepository::set(&self.pool, "job_scheduler_last_count", &count.to_string()).await;

        log::info!("Scheduler: Finished. Found {} new jobs.", count);
        
        Ok(count)
    }

    pub async fn get_status(&self) -> SchedulerStatus {
        let enabled = SettingRepository::get_bool(&self.pool, "job_scheduler_enabled").await.unwrap_or(false);
        let frequency_mins = SettingRepository::get_number(&self.pool, "job_scheduler_frequency").await.unwrap_or(60.0) as u64;
        let last_run = SettingRepository::get_string(&self.pool, "job_scheduler_last_run").await.ok();
        let last_count = SettingRepository::get_number(&self.pool, "job_scheduler_last_count").await.unwrap_or(0.0) as usize;

        let next_run = if let Some(last) = last_run.as_deref() {
             if let Ok(last_dt) = chrono::DateTime::parse_from_rfc3339(last) {
                 let next_dt = last_dt.with_timezone(&Utc) + chrono::Duration::minutes(frequency_mins as i64);
                 Some(next_dt.to_rfc3339())
             } else {
                 None
             }
        } else {
            Some(Utc::now().to_rfc3339())
        };

        SchedulerStatus {
            enabled,
            frequency_mins,
            last_run,
            next_run,
            last_count,
        }
    }

    async fn emit_status(&self) {
        let status = self.get_status().await;
        let _ = self.app_handle.emit("scheduler-status-update", status);
    }
}
