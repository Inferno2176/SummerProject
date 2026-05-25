use crate::db::error::DbResult;
use crate::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub id: String,
    pub key: String,
    pub value: String,
    pub data_type: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct AppStateRepository;

impl AppStateRepository {
    pub fn set(pool: &DbPool, key: &str, value: &str, data_type: Option<&str>) -> DbResult<AppState> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        // Try update first
        let updated = conn.execute(
            "UPDATE app_state SET value = ?, data_type = ?, updated_at = ? WHERE key = ?",
            [value, data_type.unwrap_or(""), now.as_str(), key],
        )?;
        
        if updated > 0 {
            return Self::get(pool, key)?.ok_or(crate::db::error::DbError::NotFound);
        }
        
        // Insert if not exists
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO app_state (id, key, value, data_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            [id.as_str(), key, value, data_type.unwrap_or(""), now.as_str(), now.as_str()],
        )?;

        Self::get(pool, key)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get(pool: &DbPool, key: &str) -> DbResult<Option<AppState>> {
        crate::db::connection::query_row(
            pool,
            &format!("SELECT id, key, value, data_type, created_at, updated_at FROM app_state WHERE key = '{}'", key),
            |row| {
                Ok(AppState {
                    id: row.get(0)?,
                    key: row.get(1)?,
                    value: row.get(2)?,
                    data_type: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
    }

    pub fn get_bool(pool: &DbPool, key: &str) -> DbResult<bool> {
        Self::get(pool, key)?
            .map(|state| state.value.to_lowercase() == "true")
            .ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get_string(pool: &DbPool, key: &str) -> DbResult<String> {
        Self::get(pool, key)?
            .map(|state| state.value)
            .ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn list_installed(pool: &DbPool) -> DbResult<Vec<AppState>> {
        crate::db::connection::query_rows(
            pool,
            "SELECT id, key, value, data_type, created_at, updated_at FROM app_state ORDER BY key",
            |row| {
                Ok(AppState {
                    id: row.get(0)?,
                    key: row.get(1)?,
                    value: row.get(2)?,
                    data_type: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
    }

    pub fn delete(pool: &DbPool, key: &str) -> DbResult<()> {
        let conn = crate::db::connection::get_connection(pool)?;
        conn.execute("DELETE FROM app_state WHERE key = ?", [key])?;
        Ok(())
    }

    pub fn reset_all(pool: &DbPool) -> DbResult<()> {
        let conn = crate::db::connection::get_connection(pool)?;
        conn.execute("DELETE FROM app_state", [])?;
        Ok(())
    }
}
