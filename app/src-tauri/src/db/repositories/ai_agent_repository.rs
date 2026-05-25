use crate::db::error::DbResult;
use crate::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAgent {
    pub id: String,
    pub provider: String,
    pub name: String,
    pub model_id: Option<String>,
    pub display_name: String,
    pub description: Option<String>,
    pub is_installed: bool,
    pub is_available: bool,
    pub is_default: bool,
    pub download_url: Option<String>,
    pub local_path: Option<String>,
    pub version: Option<String>,
    pub size_mb: Option<f64>,
    pub performance_tier: Option<String>,
    pub capabilities: Option<String>,
    pub last_checked: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct AIAgentRepository;

impl AIAgentRepository {
    pub fn create(
        pool: &DbPool,
        provider: &str,
        name: &str,
        display_name: &str,
        is_installed: bool,
    ) -> DbResult<AIAgent> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        let conn = crate::db::connection::get_connection(pool)?;
        conn.execute(
            "INSERT INTO ai_agents (id, provider, name, display_name, is_installed, is_available, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
            [id.as_str(), provider, name, display_name, &is_installed.to_string(), now.as_str(), now.as_str()],
        )?;

        Self::get_by_id(pool, &id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn get_by_id(pool: &DbPool, id: &str) -> DbResult<Option<AIAgent>> {
        crate::db::connection::query_row(
            pool,
            &format!(
                "SELECT id, provider, name, model_id, display_name, description, is_installed, is_available, 
                        is_default, download_url, local_path, version, size_mb, performance_tier, capabilities, 
                        last_checked, created_at, updated_at 
                 FROM ai_agents WHERE id = '{}' AND deleted_at IS NULL",
                id
            ),
            |row| {
                Ok(AIAgent {
                    id: row.get(0)?,
                    provider: row.get(1)?,
                    name: row.get(2)?,
                    model_id: row.get(3)?,
                    display_name: row.get(4)?,
                    description: row.get(5)?,
                    is_installed: row.get::<_, i32>(6)? != 0,
                    is_available: row.get::<_, i32>(7)? != 0,
                    is_default: row.get::<_, i32>(8)? != 0,
                    download_url: row.get(9)?,
                    local_path: row.get(10)?,
                    version: row.get(11)?,
                    size_mb: row.get(12)?,
                    performance_tier: row.get(13)?,
                    capabilities: row.get(14)?,
                    last_checked: row.get(15)?,
                    created_at: row.get(16)?,
                    updated_at: row.get(17)?,
                })
            },
        )
    }

    pub fn list_by_provider(pool: &DbPool, provider: &str) -> DbResult<Vec<AIAgent>> {
        crate::db::connection::query_rows(
            pool,
            &format!(
                "SELECT id, provider, name, model_id, display_name, description, is_installed, is_available, 
                        is_default, download_url, local_path, version, size_mb, performance_tier, capabilities, 
                        last_checked, created_at, updated_at 
                 FROM ai_agents WHERE provider = '{}' AND deleted_at IS NULL ORDER BY created_at DESC",
                provider
            ),
            |row| {
                Ok(AIAgent {
                    id: row.get(0)?,
                    provider: row.get(1)?,
                    name: row.get(2)?,
                    model_id: row.get(3)?,
                    display_name: row.get(4)?,
                    description: row.get(5)?,
                    is_installed: row.get::<_, i32>(6)? != 0,
                    is_available: row.get::<_, i32>(7)? != 0,
                    is_default: row.get::<_, i32>(8)? != 0,
                    download_url: row.get(9)?,
                    local_path: row.get(10)?,
                    version: row.get(11)?,
                    size_mb: row.get(12)?,
                    performance_tier: row.get(13)?,
                    capabilities: row.get(14)?,
                    last_checked: row.get(15)?,
                    created_at: row.get(16)?,
                    updated_at: row.get(17)?,
                })
            },
        )
    }

    pub fn list_installed(pool: &DbPool) -> DbResult<Vec<AIAgent>> {
        crate::db::connection::query_rows(
            pool,
            "SELECT id, provider, name, model_id, display_name, description, is_installed, is_available, 
                    is_default, download_url, local_path, version, size_mb, performance_tier, capabilities, 
                    last_checked, created_at, updated_at 
             FROM ai_agents WHERE is_installed = 1 AND deleted_at IS NULL ORDER BY provider, created_at DESC",
            |row| {
                Ok(AIAgent {
                    id: row.get(0)?,
                    provider: row.get(1)?,
                    name: row.get(2)?,
                    model_id: row.get(3)?,
                    display_name: row.get(4)?,
                    description: row.get(5)?,
                    is_installed: row.get::<_, i32>(6)? != 0,
                    is_available: row.get::<_, i32>(7)? != 0,
                    is_default: row.get::<_, i32>(8)? != 0,
                    download_url: row.get(9)?,
                    local_path: row.get(10)?,
                    version: row.get(11)?,
                    size_mb: row.get(12)?,
                    performance_tier: row.get(13)?,
                    capabilities: row.get(14)?,
                    last_checked: row.get(15)?,
                    created_at: row.get(16)?,
                    updated_at: row.get(17)?,
                })
            },
        )
    }

    pub fn get_default(pool: &DbPool) -> DbResult<Option<AIAgent>> {
        crate::db::connection::query_row(
            pool,
            "SELECT id, provider, name, model_id, display_name, description, is_installed, is_available, 
                    is_default, download_url, local_path, version, size_mb, performance_tier, capabilities, 
                    last_checked, created_at, updated_at 
             FROM ai_agents WHERE is_default = 1 AND deleted_at IS NULL LIMIT 1",
            |row| {
                Ok(AIAgent {
                    id: row.get(0)?,
                    provider: row.get(1)?,
                    name: row.get(2)?,
                    model_id: row.get(3)?,
                    display_name: row.get(4)?,
                    description: row.get(5)?,
                    is_installed: row.get::<_, i32>(6)? != 0,
                    is_available: row.get::<_, i32>(7)? != 0,
                    is_default: row.get::<_, i32>(8)? != 0,
                    download_url: row.get(9)?,
                    local_path: row.get(10)?,
                    version: row.get(11)?,
                    size_mb: row.get(12)?,
                    performance_tier: row.get(13)?,
                    capabilities: row.get(14)?,
                    last_checked: row.get(15)?,
                    created_at: row.get(16)?,
                    updated_at: row.get(17)?,
                })
            },
        )
    }

    pub fn set_default(pool: &DbPool, id: &str) -> DbResult<AIAgent> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        // Clear other defaults for this provider
        let agent = Self::get_by_id(pool, id)?.ok_or(crate::db::error::DbError::NotFound)?;
        conn.execute(
            "UPDATE ai_agents SET is_default = 0, updated_at = ? WHERE provider = ? AND id != ?",
            [now.as_str(), agent.provider.as_str(), id],
        )?;
        
        // Set this as default
        conn.execute(
            "UPDATE ai_agents SET is_default = 1, updated_at = ? WHERE id = ?",
            [now.as_str(), id],
        )?;

        Self::get_by_id(pool, id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn update_installation_status(pool: &DbPool, id: &str, is_installed: bool) -> DbResult<AIAgent> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        conn.execute(
            "UPDATE ai_agents SET is_installed = ?, is_available = ?, updated_at = ? WHERE id = ?",
            [&is_installed.to_string(), &is_installed.to_string(), now.as_str(), id],
        )?;

        Self::get_by_id(pool, id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn update_availability(pool: &DbPool, id: &str, is_available: bool) -> DbResult<AIAgent> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        conn.execute(
            "UPDATE ai_agents SET is_available = ?, last_checked = ?, updated_at = ? WHERE id = ?",
            [&is_available.to_string(), now.as_str(), now.as_str(), id],
        )?;

        Self::get_by_id(pool, id)?.ok_or(crate::db::error::DbError::NotFound)
    }

    pub fn delete(pool: &DbPool, id: &str) -> DbResult<()> {
        let now = Utc::now().to_rfc3339();
        let conn = crate::db::connection::get_connection(pool)?;
        
        conn.execute(
            "UPDATE ai_agents SET deleted_at = ? WHERE id = ?",
            [now.as_str(), id],
        )?;
        Ok(())
    }
}
