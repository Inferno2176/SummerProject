use crate::db::error::DbResult;
use crate::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatSession {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub model: String,
    pub mode: String,
    pub created_at: String,
    pub updated_at: String,
}

pub struct SessionRepository;

impl SessionRepository {
    pub fn create(pool: &DbPool, user_id: &str, title: &str, model: &str, mode: &str) -> DbResult<ChatSession> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        let conn = crate::db::connection::get_connection(pool)?;
        conn.execute(
            "INSERT INTO sessions (id, user_id, title, model, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id.as_str(), user_id, title, model, mode, now.as_str(), now.as_str()],
        )?;

        Self::get_by_id(pool, &id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get_by_id(pool: &DbPool, id: &str) -> DbResult<Option<ChatSession>> {
        crate::db::connection::query_row(
            pool,
            &format!("SELECT id, user_id, title, model, mode, created_at, updated_at FROM sessions WHERE id = '{}' AND deleted_at IS NULL", id),
            |row| {
                Ok(ChatSession {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    title: row.get(2)?,
                    model: row.get(3)?,
                    mode: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
    }

    pub fn list_by_user(pool: &DbPool, user_id: &str) -> DbResult<Vec<ChatSession>> {
        crate::db::connection::query_rows(
            pool,
            &format!("SELECT id, user_id, title, model, mode, created_at, updated_at FROM sessions WHERE user_id = '{}' AND deleted_at IS NULL ORDER BY created_at DESC", user_id),
            |row| {
                Ok(ChatSession {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    title: row.get(2)?,
                    model: row.get(3)?,
                    mode: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
    }

    pub fn update_title(pool: &DbPool, id: &str, title: &str) -> DbResult<ChatSession> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        conn.execute(
            "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
            [title, now.as_str(), id],
        )?;

        Self::get_by_id(pool, id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn delete(pool: &DbPool, id: &str) -> DbResult<()> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        conn.execute(
            "UPDATE sessions SET deleted_at = ? WHERE id = ?",
            [now.as_str(), id],
        )?;
        Ok(())
    }

    pub fn count_by_user(pool: &DbPool, user_id: &str) -> DbResult<i32> {
        crate::db::connection::query_row(
            pool,
            &format!("SELECT COUNT(*) FROM sessions WHERE user_id = '{}' AND deleted_at IS NULL", user_id),
            |row| row.get(0),
        )?
        .ok_or(crate::db::error::DbError::QueryError("Failed to count sessions".into()))
    }
}
