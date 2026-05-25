use crate::db::error::DbResult;
use crate::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct UserRepository;

impl UserRepository {
    pub fn create(pool: &DbPool, email: &str, name: Option<String>) -> DbResult<User> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        let conn = crate::db::connection::get_connection(pool)?;
        conn.execute(
            "INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            [id.as_str(), email, name.as_deref().unwrap_or(""), now.as_str(), now.as_str()],
        )?;

        Self::get_by_id(pool, &id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get_by_id(pool: &DbPool, id: &str) -> DbResult<Option<User>> {
        crate::db::connection::query_row(
            pool,
            &format!("SELECT id, email, name, avatar_url, created_at, updated_at FROM users WHERE id = '{}' AND deleted_at IS NULL", id),
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    name: row.get(2)?,
                    avatar_url: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
    }

    pub fn get_by_email(pool: &DbPool, email: &str) -> DbResult<Option<User>> {
        crate::db::connection::query_row(
            pool,
            &format!("SELECT id, email, name, avatar_url, created_at, updated_at FROM users WHERE email = '{}' AND deleted_at IS NULL", email),
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    name: row.get(2)?,
                    avatar_url: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
    }

    pub fn list_installed(pool: &DbPool) -> DbResult<Vec<User>> {
        crate::db::connection::query_rows(
            pool,
            "SELECT id, email, name, avatar_url, created_at, updated_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC",
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    name: row.get(2)?,
                    avatar_url: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
    }

    pub fn update(pool: &DbPool, id: &str, name: Option<String>, avatar_url: Option<String>) -> DbResult<User> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        let name_val = name.as_deref().unwrap_or("");
        let avatar_val = avatar_url.as_deref().unwrap_or("");
        
        conn.execute(
            "UPDATE users SET name = ?, avatar_url = ?, updated_at = ? WHERE id = ?",
            [name_val, avatar_val, now.as_str(), id],
        )?;

        Self::get_by_id(pool, id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn delete(pool: &DbPool, id: &str) -> DbResult<()> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        conn.execute(
            "UPDATE users SET deleted_at = ? WHERE id = ?",
            [now.as_str(), id],
        )?;
        Ok(())
    }
}
