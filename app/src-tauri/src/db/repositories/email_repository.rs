use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::db::connection::{execute_with_params, query_row, query_rows, DbPool};
use crate::db::error::{DbError, DbResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Email {
    pub id: String,
    pub user_id: String,
    pub sender: String,
    pub recipient: String,
    pub subject: Option<String>,
    pub body: Option<String>,
    pub received_at: String,
    pub is_read: bool,
    pub is_job_related: bool,
    pub job_id: Option<String>,
    pub ai_suggested_reply: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct EmailRepository;

impl EmailRepository {
    pub async fn create(
        pool: &DbPool,
        user_id: &str,
        sender: &str,
        recipient: &str,
        subject: Option<String>,
        body: Option<String>,
        is_job_related: bool,
        job_id: Option<String>,
    ) -> DbResult<Email> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        execute_with_params(
            pool,
            "
            INSERT INTO emails (
                id, user_id, sender, recipient, subject, body,
                received_at, is_job_related, job_id,
                created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ",
            (
                id.clone(),
                user_id.to_string(),
                sender.to_string(),
                recipient.to_string(),
                subject,
                body,
                now.clone(),
                is_job_related,
                job_id,
                now.clone(),
                now.clone(),
            ),
        )
        .await?;

        Self::get_by_id(pool, &id)
            .await?
            .ok_or(DbError::NotFound)
    }

    pub async fn get_by_id(
        pool: &DbPool,
        id: &str,
    ) -> DbResult<Option<Email>> {
        query_row(
            pool,
            "
            SELECT
                id, user_id, sender, recipient, subject, body,
                received_at, is_read, is_job_related, job_id,
                ai_suggested_reply, created_at, updated_at
            FROM emails
            WHERE id = ?1 AND deleted_at IS NULL
            ",
            [id.to_string()],
            |row| {
                Ok(Email {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    sender: row.get(2)?,
                    recipient: row.get(3)?,
                    subject: row.get(4)?,
                    body: row.get(5)?,
                    received_at: row.get(6)?,
                    is_read: row.get(7)?,
                    is_job_related: row.get(8)?,
                    job_id: row.get(9)?,
                    ai_suggested_reply: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                })
            },
        )
        .await
    }

    pub async fn list_by_user(
        pool: &DbPool,
        user_id: &str,
    ) -> DbResult<Vec<Email>> {
        query_rows(
            pool,
            "
            SELECT
                id, user_id, sender, recipient, subject, body,
                received_at, is_read, is_job_related, job_id,
                ai_suggested_reply, created_at, updated_at
            FROM emails
            WHERE user_id = ?1 AND deleted_at IS NULL
            ORDER BY received_at DESC
            ",
            [user_id.to_string()],
            |row| {
                Ok(Email {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    sender: row.get(2)?,
                    recipient: row.get(3)?,
                    subject: row.get(4)?,
                    body: row.get(5)?,
                    received_at: row.get(6)?,
                    is_read: row.get(7)?,
                    is_job_related: row.get(8)?,
                    job_id: row.get(9)?,
                    ai_suggested_reply: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                })
            },
        )
        .await
    }

    pub async fn mark_as_read(
        pool: &DbPool,
        id: &str,
    ) -> DbResult<()> {
        let now = Utc::now().to_rfc3339();
        execute_with_params(
            pool,
            "UPDATE emails SET is_read = 1, updated_at = ?1 WHERE id = ?2",
            (now, id.to_string()),
        )
        .await?;
        Ok(())
    }

    pub async fn update_suggested_reply(
        pool: &DbPool,
        id: &str,
        reply: &str,
    ) -> DbResult<()> {
        let now = Utc::now().to_rfc3339();
        execute_with_params(
            pool,
            "UPDATE emails SET ai_suggested_reply = ?1, updated_at = ?2 WHERE id = ?3",
            (reply.to_string(), now, id.to_string()),
        )
        .await?;
        Ok(())
    }

    pub async fn delete(
        pool: &DbPool,
        id: &str,
    ) -> DbResult<()> {
        let now = Utc::now().to_rfc3339();
        execute_with_params(
            pool,
            "UPDATE emails SET deleted_at = ?1 WHERE id = ?2",
            (now, id.to_string()),
        )
        .await?;
        Ok(())
    }
}
