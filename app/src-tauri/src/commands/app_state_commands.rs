/**
 * App State Tauri Commands
 * Handles onboarding, provider detection, and app configuration persistence
 */

use tauri::AppHandle;

use crate::db::{AppStateRepository, DbPool};
use crate::db::AppState;
use tauri::Manager;

/**
 * Get app state by key
 */
#[tauri::command]
pub async fn db_get_app_state(
    app: AppHandle,
    key: String,
) -> Result<Option<AppState>, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Getting app state: {}", key);
    
    AppStateRepository::get(&pool, &key)
        .map_err(|e| {
            log::error!("Failed to get app state {}: {}", key, e);
            format!("Failed to get app state: {}", e)
        })
}

/**
 * Set app state key-value pair (upsert)
 */
#[tauri::command]
pub async fn db_set_app_state(
    app: AppHandle,
    key: String,
    value: String,
    data_type: Option<String>,
) -> Result<AppState, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Setting app state: {} = {}", key, value);
    
        AppStateRepository::set(
        &pool,
        &key,
        &value,
        data_type.as_deref(),
    )
        .map_err(|e| {
            log::error!("Failed to set app state {}: {}", key, e);
            format!("Failed to set app state: {}", e)
        })
}

/**
 * Get app state as boolean
 */
#[tauri::command]
pub async fn db_get_app_state_bool(
    app: AppHandle,
    key: String,
) -> Result<bool, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Getting app state bool: {}", key);
    
    AppStateRepository::get_bool(&pool, &key)
        .map_err(|e| {
            log::error!("Failed to get app state bool {}: {}", key, e);
            format!("Failed to get app state: {}", e)
        })
}

/**
 * Get app state as string
 */
#[tauri::command]
pub async fn db_get_app_state_string(
    app: AppHandle,
    key: String,
) -> Result<String, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Getting app state string: {}", key);
    
    AppStateRepository::get_string(&pool, &key)
        .map_err(|e| {
            log::error!("Failed to get app state string {}: {}", key, e);
            format!("Failed to get app state: {}", e)
        })
}

/**
 * List all app state records
 */
#[tauri::command]
pub async fn db_list_app_state(
    app: AppHandle,
) -> Result<Vec<AppState>, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Listing all app state");
    
    AppStateRepository::list_installed(&pool)
        .map_err(|e| {
            log::error!("Failed to list app state: {}", e);
            format!("Failed to list app state: {}", e)
        })
}

/**
 * Delete app state by key
 */
#[tauri::command]
pub async fn db_delete_app_state(
    app: AppHandle,
    key: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Deleting app state: {}", key);
    
    AppStateRepository::delete(&pool, &key)
        .map_err(|e| {
            log::error!("Failed to delete app state {}: {}", key, e);
            format!("Failed to delete app state: {}", e)
        })
}

/**
 * Check if onboarding is completed
 */
#[tauri::command]
pub async fn db_is_onboarding_completed(
    app: AppHandle,
) -> Result<bool, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Checking onboarding status");
    
    AppStateRepository::get_bool(&pool, "onboarding_completed")
        .map_err(|e| {
            log::error!("Failed to check onboarding: {}", e);
            format!("Failed to check onboarding: {}", e)
        })
}

/**
 * Mark onboarding as completed
 */
#[tauri::command]
pub async fn db_complete_onboarding(
    app: AppHandle,
    provider: String,
    model: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::info!("Completing onboarding: provider={}, model={}", provider, model);
    
    // Set onboarding complete
    AppStateRepository::set(&pool, "onboarding_completed", "true", Some("boolean"))
        .map_err(|e| {
            log::error!("Failed to set onboarding_completed: {}", e);
            format!("Failed to complete onboarding: {}", e)
        })?;
    
    // Set selected provider
    AppStateRepository::set(&pool, "selected_provider", &provider, Some("string"))
        .map_err(|e| {
            log::error!("Failed to set selected_provider: {}", e);
            format!("Failed to set selected provider: {}", e)
        })?;
    
    // Set selected model
    AppStateRepository::set(&pool, "selected_model", &model, Some("string"))
        .map_err(|e| {
            log::error!("Failed to set selected_model: {}", e);
            format!("Failed to set selected model: {}", e)
        })?;
    
    Ok(())
}

/**
 * Reset onboarding status (dev/testing)
 */
#[tauri::command]
pub async fn db_reset_onboarding(
    app: AppHandle,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::warn!("Resetting onboarding status (dev operation)");
    
    AppStateRepository::set(&pool, "onboarding_completed", "false", Some("boolean"))
        .map_err(|e| {
            log::error!("Failed to reset onboarding: {}", e);
            format!("Failed to reset onboarding: {}", e)
        })?;
    
    AppStateRepository::set(&pool, "onboarding_step", "welcome", Some("string"))
        .map_err(|e| {
            log::error!("Failed to reset onboarding_step: {}", e);
            format!("Failed to reset onboarding: {}", e)
        })?;
    
    Ok(())
}

/**
 * Get current onboarding step
 */
#[tauri::command]
pub async fn db_get_onboarding_step(
    app: AppHandle,
) -> Result<String, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Getting onboarding step");
    
    AppStateRepository::get_string(&pool, "onboarding_step")
        .map(|value| value)
        .map_err(|e| {
            log::error!("Failed to get onboarding step: {}", e);
            format!("Failed to get onboarding step: {}", e)
        })
}

/**
 * Set onboarding step
 */
#[tauri::command]
pub async fn db_set_onboarding_step(
    app: AppHandle,
    step: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Setting onboarding step: {}", step);
    
    AppStateRepository::set(&pool, "onboarding_step", &step, Some("string"))
        .map_err(|e| {
            log::error!("Failed to set onboarding step: {}", e);
            format!("Failed to set onboarding step: {}", e)
        })?;
    
    Ok(())
}

/**
 * Get current selected provider
 */
#[tauri::command]
pub async fn db_get_selected_provider(
    app: AppHandle,
) -> Result<String, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Getting selected provider");
    
    AppStateRepository::get_string(&pool, "selected_provider")
        .map(|value| value)
        .map_err(|e| {
            log::error!("Failed to get selected provider: {}", e);
            format!("Failed to get selected provider: {}", e)
        })
}

/**
 * Set selected provider
 */
#[tauri::command]
pub async fn db_set_selected_provider(
    app: AppHandle,
    provider: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Setting selected provider: {}", provider);
    
    AppStateRepository::set(&pool, "selected_provider", &provider, Some("string"))
        .map_err(|e| {
            log::error!("Failed to set selected provider: {}", e);
            format!("Failed to set selected provider: {}", e)
        })?;
    
    Ok(())
}

/**
 * Get current selected model
 */
#[tauri::command]
pub async fn db_get_selected_model(
    app: AppHandle,
) -> Result<String, String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Getting selected model");
    
    AppStateRepository::get_string(&pool, "selected_model")
        .map(|value| value)
        .map_err(|e| {
            log::error!("Failed to get selected model: {}", e);
            format!("Failed to get selected model: {}", e)
        })
}

/**
 * Set selected model
 */
#[tauri::command]
pub async fn db_set_selected_model(
    app: AppHandle,
    model: String,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Setting selected model: {}", model);
    
    AppStateRepository::set(&pool, "selected_model", &model, Some("string"))
        .map_err(|e| {
            log::error!("Failed to set selected model: {}", e);
            format!("Failed to set selected model: {}", e)
        })?;
    
    Ok(())
}

/**
 * Mark Ollama as detected
 */
#[tauri::command]
pub async fn db_set_ollama_detected(
    app: AppHandle,
    detected: bool,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Setting ollama_detected: {}", detected);
    
    AppStateRepository::set(
        &pool,
        "ollama_detected",
        &detected.to_string(),
        Some("boolean"),
    )
    .map_err(|e| {
        log::error!("Failed to set ollama_detected: {}", e);
        format!("Failed to set ollama_detected: {}", e)
    })?;
    
    Ok(())
}

/**
 * Mark Claude CLI as detected
 */
#[tauri::command]
pub async fn db_set_claude_detected(
    app: AppHandle,
    detected: bool,
) -> Result<(), String> {
    let pool = app.state::<DbPool>();
    
    log::debug!("Setting claude_cli_detected: {}", detected);
    
    AppStateRepository::set(
        &pool,
        "claude_cli_detected",
        &detected.to_string(),
        Some("boolean"),
    )
    .map_err(|e| {
        log::error!("Failed to set claude_cli_detected: {}", e);
        format!("Failed to set claude_cli_detected: {}", e)
    })?;
    
    Ok(())
}
