use crate::db::error::DbResult;
use crate::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub id: String,
    pub key: String,
    pub value: String,
    pub data_type: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct SettingRepository;

impl SettingRepository {
    pub fn set(pool: &DbPool, key: &str, value: &str) -> DbResult<Setting> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        // Try update first
        let updated = conn.execute(
            "UPDATE settings SET value = ?, updated_at = ? WHERE key = ?",
            [value, now.as_str(), key],
        )?;
        
        if updated > 0 {
            return Self::get(pool, key)?.ok_or(crate::db::error::DbError::NotFound);
        }
        
        // Insert if not exists
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO settings (id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            [id.as_str(), key, value, now.as_str(), now.as_str()],
        )?;

        Self::get(pool, key)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get(pool: &DbPool, key: &str) -> DbResult<Option<Setting>> {
        crate::db::connection::query_row(
            pool,
            &format!("SELECT id, key, value, data_type, description, created_at, updated_at FROM settings WHERE key = '{}'", key),
            |row| {
                Ok(Setting {
                    id: row.get(0)?,
                    key: row.get(1)?,
                    value: row.get(2)?,
                    data_type: row.get(3)?,
                    description: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
    }

    pub fn get_bool(pool: &DbPool, key: &str) -> DbResult<bool> {
        Self::get(pool, key)?
            .map(|setting| setting.value.to_lowercase() == "true")
            .ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get_string(pool: &DbPool, key: &str) -> DbResult<String> {
        Self::get(pool, key)?
            .map(|setting| setting.value)
            .ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get_number(pool: &DbPool, key: &str) -> DbResult<f64> {
        Self::get(pool, key)?
            .map(|setting| setting.value.parse::<f64>().unwrap_or(0.0))
            .ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn list_installed(pool: &DbPool) -> DbResult<Vec<Setting>> {
        crate::db::connection::query_rows(
            pool,
            "SELECT id, key, value, data_type, description, created_at, updated_at FROM settings ORDER BY key",
            |row| {
                Ok(Setting {
                    id: row.get(0)?,
                    key: row.get(1)?,
                    value: row.get(2)?,
                    data_type: row.get(3)?,
                    description: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
    }

    pub fn delete(pool: &DbPool, key: &str) -> DbResult<()> {
        let conn = crate::db::connection::get_connection(pool)?;
        conn.execute("DELETE FROM settings WHERE key = ?", [key])?;
        Ok(())
    }

    pub fn reset_to_defaults(pool: &DbPool) -> DbResult<()> {
        let conn = crate::db::connection::get_connection(pool)?;
        conn.execute("DELETE FROM settings", [])?;
        Ok(())
    }
}
