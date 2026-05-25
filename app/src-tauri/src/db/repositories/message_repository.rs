use crate::db::error::DbResult;
use crate::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub model: Option<String>,
    pub tokens_used: Option<i32>,
    pub created_at: String,
}

pub struct MessageRepository;

impl MessageRepository {
    pub fn create(
        pool: &DbPool,
        session_id: &str,
        role: &str,
        content: &str,
        model: Option<String>,
        tokens_used: Option<i32>,
    ) -> DbResult<ChatMessage> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        let conn = crate::db::connection::get_connection(pool)?;
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, model, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                id.as_str(),
                session_id,
                role,
                content,
                model.as_deref().unwrap_or(""),
                &tokens_used.unwrap_or(0).to_string(),
                now.as_str(),
            ],
        )?;

        Self::get_by_id(pool, &id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get_by_id(pool: &DbPool, id: &str) -> DbResult<Option<ChatMessage>> {
        crate::db::connection::query_row(
            pool,
            &format!("SELECT id, session_id, role, content, model, tokens_used, created_at FROM messages WHERE id = '{}' AND deleted_at IS NULL", id),
            |row| {
                Ok(ChatMessage {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    model: row.get(4)?,
                    tokens_used: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
    }

    pub fn list_by_session(pool: &DbPool, session_id: &str) -> DbResult<Vec<ChatMessage>> {
        crate::db::connection::query_rows(
            pool,
            &format!("SELECT id, session_id, role, content, model, tokens_used, created_at FROM messages WHERE session_id = '{}' AND deleted_at IS NULL ORDER BY created_at ASC", session_id),
            |row| {
                Ok(ChatMessage {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    model: row.get(4)?,
                    tokens_used: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
    }

    pub fn list_recent(pool: &DbPool, session_id: &str, limit: i32) -> DbResult<Vec<ChatMessage>> {
        crate::db::connection::query_rows(
            pool,
            &format!(
                "SELECT id, session_id, role, content, model, tokens_used, created_at FROM messages 
                 WHERE session_id = '{}' AND deleted_at IS NULL 
                 ORDER BY created_at DESC LIMIT {}",
                session_id, limit
            ),
            |row| {
                Ok(ChatMessage {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    model: row.get(4)?,
                    tokens_used: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
    }

    pub fn delete(pool: &DbPool, id: &str) -> DbResult<()> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        conn.execute(
            "UPDATE messages SET deleted_at = ? WHERE id = ?",
            [now.as_str(), id],
        )?;
        Ok(())
    }

    pub fn delete_by_session(pool: &DbPool, session_id: &str) -> DbResult<()> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        conn.execute(
            "UPDATE messages SET deleted_at = ? WHERE session_id = ?",
            [now.as_str(), session_id],
        )?;
        Ok(())
    }

    pub fn count_tokens_by_session(pool: &DbPool, session_id: &str) -> DbResult<i64> {
        crate::db::connection::query_row(
            pool,
            &format!("SELECT COALESCE(SUM(tokens_used), 0) FROM messages WHERE session_id = '{}' AND deleted_at IS NULL", session_id),
            |row| row.get(0),
        )?
        .ok_or(crate::db::error::DbError::QueryError("Failed to count tokens".into()))
    }
}
