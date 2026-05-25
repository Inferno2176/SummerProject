/**
 * AI Agent Tauri Commands
 * Handles AI model management, installation status, and default selection
 */

use tauri::AppHandle;
use crate::db::{AIAgentRepository, DbPool};
use crate::db::AIAgent;
use tauri::Manager;
/**
 * Create new AI agent
 */
#[tauri::command]
pub async fn db_create_ai_agent(
    app: AppHandle,
    provider: String,
    name: String,
    display_name: String,
    is_installed: Option<bool>,
) -> Result<AIAgent, String> {
    let pool = app.state::<DbPool>();
    
    log::info!("Creating AI agent: provider={}, name={}, display_name={}", provider, name, display_name);
    
    AIAgentRepository::create(&pool, &provider, &name, &display_name, is_installed.unwrap_or(false))
        .map_err(|e| {
            log::error!("Failed to create AI agent: {}", e);
            format!("Failed to create AI agent: {}", e)
        })
}

/**
 * Get AI agent by ID
 */
#[tauri::command]
pub async fn db_get_ai_agent(
    app: AppHandle,
    id: String,
) -> Result<Option<AIAgent>, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Getting AI agent: {}", id);
    
    AIAgentRepository::get_by_id(&pool, &id)
        .map_err(|e| {
            log::error!("Failed to get AI agent {}: {}", id, e);
            format!("Failed to get AI agent: {}", e)
        })
}

/**
 * List AI agents by provider
 */
#[tauri::command]
pub async fn db_list_ai_agents_by_provider(
    app: AppHandle,
    provider: String,
) -> Result<Vec<AIAgent>, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Listing AI agents by provider: {}", provider);
    
    AIAgentRepository::list_by_provider(&pool, &provider)
        .map_err(|e| {
            log::error!("Failed to list AI agents for provider {}: {}", provider, e);
            format!("Failed to list AI agents: {}", e)
        })
}

/**
 * List installed AI agents
 */
#[tauri::command]
pub async fn db_list_installed_ai_agents(
    app: AppHandle,
) -> Result<Vec<AIAgent>, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Listing installed AI agents");
    
    AIAgentRepository::list_installed(&pool)
        .map_err(|e| {
            log::error!("Failed to list installed AI agents: {}", e);
            format!("Failed to list installed AI agents: {}", e)
        })
}

/**
 * Get default AI agent
 */
#[tauri::command]
pub async fn db_get_default_ai_agent(
    app: AppHandle,
) -> Result<Option<AIAgent>, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Getting default AI agent");
    
    AIAgentRepository::get_default(&pool)
        .map_err(|e| {
            log::error!("Failed to get default AI agent: {}", e);
            format!("Failed to get default AI agent: {}", e)
        })
}

/**
 * Set AI agent as default
 */
#[tauri::command]
pub async fn db_set_default_ai_agent(
    app: AppHandle,
    id: String,
) -> Result<AIAgent, String> {
    let pool = app.state::<DbPool>();
    
    log::info!("Setting default AI agent: {}", id);
    
    AIAgentRepository::set_default(&pool, &id)
        .map_err(|e| {
            log::error!("Failed to set default AI agent {}: {}", id, e);
            format!("Failed to set default AI agent: {}", e)
        })
}

/**
 * Update AI agent installation status
 */
#[tauri::command]
pub async fn db_update_ai_agent_install_status(
    app: AppHandle,
    id: String,
    is_installed: bool,
) -> Result<AIAgent, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Updating AI agent installation status: id={}, is_installed={}", id, is_installed);
    
    AIAgentRepository::update_installation_status(&pool, &id, is_installed)
        .map_err(|e| {
            log::error!("Failed to update AI agent installation status: {}", e);
            format!("Failed to update installation status: {}", e)
        })
}

/**
 * Update AI agent availability status
 */
#[tauri::command]
pub async fn db_update_ai_agent_availability(
    app: AppHandle,
    id: String,
    is_available: bool,
) -> Result<AIAgent, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Updating AI agent availability: id={}, is_available={}", id, is_available);
    
    AIAgentRepository::update_availability(&pool, &id, is_available)
        .map_err(|e| {
            log::error!("Failed to update AI agent availability: {}", e);
            format!("Failed to update availability: {}", e)
        })
}

/**
 * Delete AI agent (soft delete)
 */
#[tauri::command]
pub async fn db_delete_ai_agent(
    app: AppHandle,
    id: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Deleting AI agent: {}", id);
    
    AIAgentRepository::delete(&pool, &id)
        .map_err(|e| {
            log::error!("Failed to delete AI agent {}: {}", id, e);
            format!("Failed to delete AI agent: {}", e)
        })
}

/**
 * Get all AI agents (including deleted)
 */
#[tauri::command]
pub async fn db_list_all_ai_agents(
    app: AppHandle,
) -> Result<Vec<AIAgent>, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Listing all AI agents");
    
    AIAgentRepository::list_installed(&pool)
        .map_err(|e| {
            log::error!("Failed to list all AI agents: {}", e);
            format!("Failed to list all AI agents: {}", e)
        })
}
