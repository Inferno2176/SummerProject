/**
 * Tauri Invoke Wrapper Layer
 * Type-safe wrappers for all database IPC commands
 * Handles loading states, retries, and error handling
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  AppState,
  AIAgent,
  Setting,
} from './models';

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 100,
  backoffMultiplier: 2,
};

/**
 * Generic invoke wrapper with retry support
 */
async function invokeWithRetry<T>(
  command: string,
  args?: Record<string, unknown>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await invoke<T>(command, args);
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retryConfig.maxRetries) {
        const delay = retryConfig.delayMs * Math.pow(retryConfig.backoffMultiplier, attempt);
        console.warn(`Command ${command} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Command ${command} failed after ${retryConfig.maxRetries} retries`);
}

// ============ App State Invoke Wrappers ============

export const appStateInvoke = {
  async get(key: string): Promise<AppState | null> {
    return invokeWithRetry('db_get_app_state', { key });
  },

  async set(key: string, value: string, dataType?: string): Promise<AppState> {
    return invokeWithRetry('db_set_app_state', { key, value, data_type: dataType });
  },

  async getBool(key: string): Promise<boolean> {
    return invokeWithRetry('db_get_app_state_bool', { key });
  },

  async getString(key: string): Promise<string | null> {
    return invokeWithRetry('db_get_app_state_string', { key });
  },

  async listAll(): Promise<AppState[]> {
    return invokeWithRetry('db_list_app_state', {});
  },

  async delete(key: string): Promise<void> {
    return invokeWithRetry('db_delete_app_state', { key });
  },

  async isOnboardingCompleted(): Promise<boolean> {
    return invokeWithRetry('db_is_onboarding_completed', {});
  },

  async completeOnboarding(provider: string, model: string): Promise<void> {
    return invokeWithRetry('db_complete_onboarding', { provider, model });
  },

  async resetOnboarding(): Promise<void> {
    return invokeWithRetry('db_reset_onboarding', {});
  },

  async getOnboardingStep(): Promise<string> {
    return invokeWithRetry('db_get_onboarding_step', {});
  },

  async setOnboardingStep(step: string): Promise<void> {
    return invokeWithRetry('db_set_onboarding_step', { step });
  },

  async getSelectedProvider(): Promise<string> {
    return invokeWithRetry('db_get_selected_provider', {});
  },

  async setSelectedProvider(provider: string): Promise<void> {
    return invokeWithRetry('db_set_selected_provider', { provider });
  },

  async getSelectedModel(): Promise<string> {
    return invokeWithRetry('db_get_selected_model', {});
  },

  async setSelectedModel(model: string): Promise<void> {
    return invokeWithRetry('db_set_selected_model', { model });
  },

  async setOllamaDetected(detected: boolean): Promise<void> {
    return invokeWithRetry('db_set_ollama_detected', { detected });
  },

  async setClaudeDetected(detected: boolean): Promise<void> {
    return invokeWithRetry('db_set_claude_detected', { detected });
  },
};

// ============ AI Agent Invoke Wrappers ============

export const aiAgentInvoke = {
  async create(
    provider: string,
    name: string,
    displayName: string,
    isInstalled?: boolean
  ): Promise<AIAgent> {
    return invokeWithRetry('db_create_ai_agent', {
      provider,
      name,
      display_name: displayName,
      is_installed: isInstalled,
    });
  },

  async get(id: string): Promise<AIAgent | null> {
    return invokeWithRetry('db_get_ai_agent', { id });
  },

  async listByProvider(provider: string): Promise<AIAgent[]> {
    return invokeWithRetry('db_list_ai_agents_by_provider', { provider });
  },

  async listInstalled(): Promise<AIAgent[]> {
    return invokeWithRetry('db_list_installed_ai_agents', {});
  },

  async getDefault(): Promise<AIAgent | null> {
    return invokeWithRetry('db_get_default_ai_agent', {});
  },

  async setDefault(id: string): Promise<AIAgent> {
    return invokeWithRetry('db_set_default_ai_agent', { id });
  },

  async updateInstallStatus(id: string, isInstalled: boolean): Promise<AIAgent> {
    return invokeWithRetry('db_update_ai_agent_install_status', {
      id,
      is_installed: isInstalled,
    });
  },

  async updateAvailability(id: string, isAvailable: boolean): Promise<AIAgent> {
    return invokeWithRetry('db_update_ai_agent_availability', {
      id,
      is_available: isAvailable,
    });
  },

  async delete(id: string): Promise<void> {
    return invokeWithRetry('db_delete_ai_agent', { id });
  },

  async listAll(): Promise<AIAgent[]> {
    return invokeWithRetry('db_list_all_ai_agents', {});
  },
};

// ============ Settings Invoke Wrappers ============

export const settingsInvoke = {
  async get(key: string): Promise<Setting | null> {
    return invokeWithRetry('db_get_setting', { key });
  },

  async set(key: string, value: string): Promise<Setting> {
    return invokeWithRetry('db_set_setting', { key, value });
  },

  async getBool(key: string): Promise<boolean> {
    return invokeWithRetry('db_get_setting_bool', { key });
  },

  async getString(key: string): Promise<string | null> {
    return invokeWithRetry('db_get_setting_string', { key });
  },

  async getNumber(key: string): Promise<number> {
    return invokeWithRetry('db_get_setting_number', { key });
  },

  async listAll(): Promise<Setting[]> {
    return invokeWithRetry('db_list_settings', {});
  },

  async delete(key: string): Promise<void> {
    return invokeWithRetry('db_delete_setting', { key });
  },

  async resetToDefaults(): Promise<void> {
    return invokeWithRetry('db_reset_settings_to_defaults', {});
  },

  async getTheme(): Promise<string> {
    return invokeWithRetry('db_get_theme', {});
  },

  async setTheme(theme: string): Promise<void> {
    return invokeWithRetry('db_set_theme', { theme });
  },

  async getAutoSaveSessions(): Promise<boolean> {
    return invokeWithRetry('db_get_auto_save_sessions', {});
  },

  async setAutoSaveSessions(enabled: boolean): Promise<void> {
    return invokeWithRetry('db_set_auto_save_sessions', { enabled });
  },
};

// ============ Database Health Invoke Wrappers ============

export const dbHealthInvoke = {
  async ping(): Promise<boolean> {
    try {
      return await invokeWithRetry('db_ping', {});
    } catch {
      return false;
    }
  },

  async getSize(): Promise<number> {
    return invokeWithRetry('db_get_size', {});
  },
};

/**
 * Master invoke namespace combining all wrappers
 */
export const dbInvoke = {
  appState: appStateInvoke,
  aiAgent: aiAgentInvoke,
  settings: settingsInvoke,
  health: dbHealthInvoke,
};
