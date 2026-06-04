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
  User,
  ChatSession,
  ChatMessage,
  Resume,
  Job,
  ActivityLog,
  GeneratedResume,
  GeneratedCoverLetter,
  JobApplication,
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

  async resetSettingsToDefaults(): Promise<void> {
    return invokeWithRetry('db_reset_settings_to_defaults', {});
  },

  async getSchedulerStatus(): Promise<any> {
    return invokeWithRetry('get_scheduler_status', {});
  },

  async toggleScheduler(enabled: boolean): Promise<void> {
    return invokeWithRetry('toggle_scheduler', { enabled });
  },

  async updateSchedulerFrequency(mins: number): Promise<void> {
    return invokeWithRetry('update_scheduler_frequency', { mins });
  },

  async runSchedulerNow(): Promise<number> {
    return invokeWithRetry('run_scheduler_now', {});
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

// ============ User Invoke Wrappers ============

export const userInvoke = {
  async create(email: string, name?: string): Promise<User> {
    return invokeWithRetry('db_create_user', { email, name });
  },

  async get(id: string): Promise<User | null> {
    return invokeWithRetry('db_get_user', { id });
  },

  async getByEmail(email: string): Promise<User | null> {
    return invokeWithRetry('db_get_user_by_email', { email });
  },

  async listAll(): Promise<User[]> {
    return invokeWithRetry('db_list_users', {});
  },

  async update(id: string, name?: string, avatarUrl?: string): Promise<User> {
    return invokeWithRetry('db_update_user', { id, name, avatar_url: avatarUrl });
  },

  async delete(id: string): Promise<void> {
    return invokeWithRetry('db_delete_user', { id });
  },
};

// ============ Session Invoke Wrappers ============

export const sessionInvoke = {
  async create(
    user_id: string,
    title: string,
    model: string,
    mode: string,
    job_id?: string,
    job_description?: string,
    company?: string,
    job_title?: string
  ): Promise<ChatSession> {
    return invokeWithRetry('db_create_session', {
      user_id,
      title,
      model,
      mode,
      job_id,
      job_description,
      company,
      job_title,
    });
  },

  async get(id: string): Promise<ChatSession | null> {
    return invokeWithRetry('db_get_session', { id });
  },

  async listByUser(user_id: string): Promise<ChatSession[]> {
    return invokeWithRetry('db_list_user_sessions', { user_id });
  },

  async updateTitle(id: string, title: string): Promise<ChatSession> {
    return invokeWithRetry('db_update_session_title', { id, title });
  },

  async delete(id: string): Promise<void> {
    return invokeWithRetry('db_delete_session', { id });
  },

  async countByUser(user_id: string): Promise<number> {
    return invokeWithRetry('db_count_user_sessions', { user_id });
  },
};

// ============ Message Invoke Wrappers ============

export const messageInvoke = {
  async create(
    session_id: string,
    role: string,
    content: string,
    model?: string,
    tokens_used?: number
  ): Promise<ChatMessage> {
    return invokeWithRetry('db_create_message', {
      session_id,
      role,
      content,
      model,
      tokens_used,
    });
  },

  async get(id: string): Promise<ChatMessage | null> {
    return invokeWithRetry('db_get_message', { id });
  },

  async listBySession(session_id: string): Promise<ChatMessage[]> {
    return invokeWithRetry('db_list_session_messages', { session_id });
  },

  async listRecent(limit: number): Promise<ChatMessage[]> {
    return invokeWithRetry('db_list_recent_messages', { limit });
  },

  async delete(id: string): Promise<void> {
    return invokeWithRetry('db_delete_message', { id });
  },

  async countTokens(session_id: string): Promise<number> {
    return invokeWithRetry('db_count_session_tokens', { session_id });
  },
};

// ============ Resume Invoke Wrappers ============

export const resumeInvoke = {
  async create(
    user_id: string,
    filename: string,
    file_path: string,
    file_size?: number,
    mime_type?: string,
    hash?: string
  ): Promise<Resume> {
    return invokeWithRetry('db_create_resume', {
      user_id,
      filename,
      file_path,
      file_size,
      mime_type,
      hash,
    });
  },

  async get(id: string): Promise<Resume | null> {
    return invokeWithRetry('db_get_resume', { id });
  },

  async listByUser(user_id: string): Promise<Resume[]> {
    return invokeWithRetry('db_list_resumes', { user_id });
  },

  async setDefault(id: string, user_id: string): Promise<void> {
    return invokeWithRetry('db_set_default_resume', { id, user_id });
  },

  async getDefault(user_id: string): Promise<Resume | null> {
    return invokeWithRetry('db_get_default_resume', { user_id });
  },

  async updateContent(id: string, content: string): Promise<void> {
    return invokeWithRetry('db_update_resume_content', { id, content });
  },

  async delete(id: string): Promise<void> {
    return invokeWithRetry('db_delete_resume', { id });
  },

  async upload(path: string): Promise<Resume> {
    return invokeWithRetry('upload_resume', { path });
  },

  async parseAndStore(fileName: string, fileBytes: number[]): Promise<Resume> {
    return invokeWithRetry('parse_and_store_resume', { fileName, fileBytes });
  },

  async view(path: string): Promise<void> {
    return invokeWithRetry('view_resume', { path });
  },

  async download(path: string): Promise<void> {
    return invokeWithRetry('download_resume', { path });
  },
};

// ============ Job Invoke Wrappers ============

export const jobInvoke = {
  async create(
    user_id: string,
    title: string,
    company?: string,
    url?: string
  ): Promise<Job> {
    return invokeWithRetry('db_create_job', { user_id, title, company, url });
  },

  async get(id: string): Promise<Job | null> {
    return invokeWithRetry('db_get_job', { id });
  },

  async listByUser(user_id: string): Promise<Job[]> {
    return invokeWithRetry('db_list_jobs', { user_id });
  },

  async updateStatus(id: string, status: string): Promise<void> {
    return invokeWithRetry('db_update_job_status', { id, status });
  },

  async delete(id: string): Promise<void> {
    return invokeWithRetry('db_delete_job', { id });
  },

  async fetch(title?: string, location?: string, remote: boolean = false): Promise<number> {
    return invokeWithRetry('fetch_jobs', { title, location, remote });
  },

  async search(queryText: string): Promise<Job[]> {
    return invokeWithRetry('search_jobs', { query_text: queryText });
  },

  async save(id: string): Promise<void> {
    return invokeWithRetry('save_job', { id });
  },

  async reject(id: string): Promise<void> {
    return invokeWithRetry('reject_job', { id });
  },

  async listAll(): Promise<Job[]> {
    return invokeWithRetry('get_jobs', {});
  },
};

// ============ Activity Log Invoke Wrappers ============

export const activityLogInvoke = {
  async create(
    user_id: string | null,
    action: string,
    entity_type?: string,
    entity_id?: string,
    details?: string
  ): Promise<ActivityLog> {
    return invokeWithRetry('db_create_activity_log', {
      user_id,
      action,
      entity_type,
      entity_id,
      details,
    });
  },

  async listByUser(user_id: string, limit: number): Promise<ActivityLog[]> {
    return invokeWithRetry('db_list_activity_logs', { user_id, limit });
  },
};

// ============ ATS Invoke Wrappers ============

export const atsInvoke = {
  async generateResume(job_id: string, resume_id: string): Promise<GeneratedResume> {
    return invokeWithRetry('generate_ats_resume', { job_id, resume_id });
  },

  async generateCoverLetter(job_id: string, resume_id: string): Promise<GeneratedCoverLetter> {
    return invokeWithRetry('generate_cover_letter', { job_id, resume_id });
  },

  async listGeneratedResumes(job_id: string): Promise<GeneratedResume[]> {
    return invokeWithRetry('db_list_generated_resumes', { job_id });
  },

  async listGeneratedCoverLetters(job_id: string): Promise<GeneratedCoverLetter[]> {
    return invokeWithRetry('db_list_generated_cover_letters', { job_id });
  },

  async listAllGeneratedResumes(user_id: string): Promise<GeneratedResume[]> {
    return invokeWithRetry('db_list_all_generated_resumes', { user_id });
  },

  async listAllGeneratedCoverLetters(user_id: string): Promise<GeneratedCoverLetter[]> {
    return invokeWithRetry('db_list_all_generated_cover_letters', { user_id });
  },

  async deleteGeneratedResume(id: string): Promise<void> {
    return invokeWithRetry('db_delete_generated_resume', { id });
  },

  async deleteGeneratedCoverLetter(id: string): Promise<void> {
    return invokeWithRetry('db_delete_generated_cover_letter', { id });
  },

  async markAsApplied(
    job_id: string,
    resume_id?: string,
    cover_letter_id?: string
  ): Promise<JobApplication> {
    return invokeWithRetry('mark_job_as_applied', {
      job_id,
      resume_id,
      cover_letter_id,
    });
  },

  async listApplications(user_id: string): Promise<JobApplication[]> {
    return invokeWithRetry('db_list_applications', { user_id });
  },

  async getApplicationByJob(job_id: string): Promise<JobApplication | null> {
    return invokeWithRetry('db_get_application_by_job', { job_id });
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
  user: userInvoke,
  session: sessionInvoke,
  message: messageInvoke,
  resume: resumeInvoke,
  job: jobInvoke,
  activityLog: activityLogInvoke,
  health: dbHealthInvoke,
  ats: atsInvoke,
};
