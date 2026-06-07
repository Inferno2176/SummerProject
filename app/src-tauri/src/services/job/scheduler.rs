use std::sync::Arc;
use tokio::time::{interval, Duration};
use tauri::{AppHandle, Emitter};
use crate::db::{DbPool, SettingRepository, UserRepository, ResumeRepository};
use crate::db::repositories::email_repository::EmailRepository;
use super::{JobDiscoveryEngine, JobSearchQuery};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri_plugin_notification::NotificationExt;

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
        
        // Get default user or create if not exists
        let user = match UserRepository::get_by_email(&self.pool, "localuser@careerforges.local").await {
            Ok(Some(u)) => u,
            _ => {
                log::info!("Scheduler: Creating local user...");
                UserRepository::create(&self.pool, "localuser@careerforges.local", Some("Local User".to_string())).await
                    .map_err(|e| format!("Failed to create local user: {}", e))?
            }
        };

        // Try to get search parameters from default resume
        let mut query = JobSearchQuery {
            title: None,
            location: None,
            skills: vec![],
            experience_years: None,
            remote: false,
        };

        if let Ok(Some(resume)) = ResumeRepository::get_default(&self.pool, &user.id).await {
            if let Some(json_str) = resume.master_resume_json.as_deref() {
                if let Ok(master) = serde_json::from_str::<serde_json::Value>(json_str) {
                    let profile = &master["profile"];
                    
                    // Prioritize first experience title as job title for search
                    if let Some(exp_list) = profile["experience"].as_array() {
                        if let Some(first_exp) = exp_list.first() {
                            query.title = first_exp["title"].as_str().map(|s| s.to_string());
                        }
                    }

                    if let Some(skills) = profile["skills"].as_array() {
                        query.skills = skills.iter()
                            .filter_map(|v| v.as_str())
                            .take(5)
                            .map(|s| s.to_string())
                            .collect();
                    }
                }
            }
        }

        // If still no title, use a generic default to at least fetch something
        if query.title.is_none() {
            query.title = Some("Software Engineer".to_string());
        }

        let count = engine.fetch_and_match(&user.id, &query)
            .await
            .map_err(|e| e.to_string())?;

        if count > 0 {
            let _ = self.app_handle.emit("new-jobs-discovered", count);
        }

        // Email simulation
        let _ = self.simulate_emails(&user.id).await;

        let now = Utc::now().to_rfc3339();
        
        // Update persistence
        let _ = SettingRepository::set(&self.pool, "job_scheduler_last_run", &now).await;
        let _ = SettingRepository::set(&self.pool, "job_scheduler_last_count", &count.to_string()).await;

        log::info!("Scheduler: Finished. Found {} new jobs.", count);
        
        Ok(count)
    }

    async fn simulate_emails(&self, user_id: &str) -> Result<(), String> {
        // Pseudo-random chance based on timestamp (30% chance)
        let now_ts = Utc::now().timestamp();
        if now_ts % 10 < 3 {
            let recruiters = [
                ("google-recruiter@google.com", "Google", "Your application for Software Engineer"),
                ("hr@stripe.com", "Stripe", "Next steps: Interview with Stripe"),
                ("talent@netflix.com", "Netflix", "Regarding your interest in Netflix"),
            ];
            
            let idx = (now_ts % recruiters.len() as i64) as usize;
            let (sender, company, subject) = recruiters[idx];
            
            let body = format!("Hi there,\n\nThanks for applying to {}. We've reviewed your resume and would like to schedule a call to discuss the role further.\n\nPlease let us know your availability for next week.\n\nBest regards,\n{} Recruitment Team", company, company);
            
            let email = EmailRepository::create(
                &self.pool,
                user_id,
                sender,
                "localuser@careerforges.local",
                Some(subject.to_string()),
                Some(body),
                true,
                None,
            ).await.map_err(|e| e.to_string())?;
            
            let _ = self.app_handle.emit("new-email-received", email);
            
            // Trigger OS notification
            let _ = self.app_handle.notification()
                .builder()
                .title("New Career Email")
                .body(format!("Recruiter from {} reached out!", company))
                .show();
        }
        Ok(())
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
