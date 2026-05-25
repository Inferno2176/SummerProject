/**
 * Database service layer for frontend
 * Communicates with Rust backend through Tauri IPC via invoke wrappers
 */

import { dbInvoke } from './invoke';
import type {
  User,
  ChatSession,
  ChatMessage,
  Resume,
  Job,
  Preference,
  InterviewSession,
  ActivityLog,
  AppState,
  AppStateKey,
  AIAgent,
  Setting,
  SettingKey,
} from './models';

class DatabaseService {
  // ============ User Operations ============
  
  async createUser(email: string, name?: string): Promise<User> {
    throw new Error('User operations not yet implemented via IPC');
  }

  async getUser(id: string): Promise<User | null> {
    throw new Error('User operations not yet implemented via IPC');
  }

  async getUserByEmail(email: string): Promise<User | null> {
    throw new Error('User operations not yet implemented via IPC');
  }

  async listUsers(): Promise<User[]> {
    throw new Error('User operations not yet implemented via IPC');
  }

  async updateUser(id: string, name?: string, avatar_url?: string): Promise<User> {
    throw new Error('User operations not yet implemented via IPC');
  }

  async deleteUser(id: string): Promise<void> {
    throw new Error('User operations not yet implemented via IPC');
  }

  // ============ Session Operations ============

  async createSession(
    user_id: string,
    title: string,
    model: string,
    mode: string
  ): Promise<ChatSession> {
    throw new Error('Session operations not yet implemented via IPC');
  }

  async getSession(id: string): Promise<ChatSession | null> {
    throw new Error('Session operations not yet implemented via IPC');
  }

  async listUserSessions(user_id: string): Promise<ChatSession[]> {
    throw new Error('Session operations not yet implemented via IPC');
  }

  async updateSessionTitle(id: string, title: string): Promise<ChatSession> {
    throw new Error('Session operations not yet implemented via IPC');
  }

  async deleteSession(id: string): Promise<void> {
    throw new Error('Session operations not yet implemented via IPC');
  }

  async countUserSessions(user_id: string): Promise<number> {
    throw new Error('Session operations not yet implemented via IPC');
  }

  // ============ Message Operations ============

  async createMessage(
    session_id: string,
    role: 'user' | 'assistant',
    content: string,
    model?: string,
    tokens_used?: number
  ): Promise<ChatMessage> {
    throw new Error('Message operations not yet implemented via IPC');
  }

  async getMessage(id: string): Promise<ChatMessage | null> {
    throw new Error('Message operations not yet implemented via IPC');
  }

  async listSessionMessages(session_id: string): Promise<ChatMessage[]> {
    throw new Error('Message operations not yet implemented via IPC');
  }

  async listRecentMessages(session_id: string, limit: number = 10): Promise<ChatMessage[]> {
    throw new Error('Message operations not yet implemented via IPC');
  }

  async deleteMessage(id: string): Promise<void> {
    throw new Error('Message operations not yet implemented via IPC');
  }

  async deleteSessionMessages(session_id: string): Promise<void> {
    throw new Error('Message operations not yet implemented via IPC');
  }

  async countSessionTokens(session_id: string): Promise<number> {
    throw new Error('Message operations not yet implemented via IPC');
  }

  // ============ Resume Operations ============

  async createResume(
    user_id: string,
    filename: string,
    file_path: string,
    file_size?: number,
    mime_type?: string
  ): Promise<Resume> {
    throw new Error('Resume operations not yet implemented via IPC');
  }

  async getResume(id: string): Promise<Resume | null> {
    throw new Error('Resume operations not yet implemented via IPC');
  }

  async listUserResumes(user_id: string): Promise<Resume[]> {
    throw new Error('Resume operations not yet implemented via IPC');
  }

  async setDefaultResume(id: string): Promise<Resume> {
    throw new Error('Resume operations not yet implemented via IPC');
  }

  async deleteResume(id: string): Promise<void> {
    throw new Error('Resume operations not yet implemented via IPC');
  }

  // ============ Job Operations ============

  async createJob(
    user_id: string,
    title: string,
    company?: string,
    url?: string
  ): Promise<Job> {
    throw new Error('Job operations not yet implemented via IPC');
  }

  async getJob(id: string): Promise<Job | null> {
    throw new Error('Job operations not yet implemented via IPC');
  }

  async listUserJobs(user_id: string, status?: string): Promise<Job[]> {
    throw new Error('Job operations not yet implemented via IPC');
  }

  async updateJobStatus(id: string, status: Job['status']): Promise<Job> {
    throw new Error('Job operations not yet implemented via IPC');
  }

  async deleteJob(id: string): Promise<void> {
    throw new Error('Job operations not yet implemented via IPC');
  }

  // ============ Preference Operations ============

  async setPreference(user_id: string, key: string, value: string): Promise<Preference> {
    throw new Error('Preference operations not yet implemented via IPC');
  }

  async getPreference(user_id: string, key: string): Promise<Preference | null> {
    throw new Error('Preference operations not yet implemented via IPC');
  }

  async listUserPreferences(user_id: string): Promise<Preference[]> {
    throw new Error('Preference operations not yet implemented via IPC');
  }

  // ============ Activity Logging ============

  async logActivity(
    action: string,
    entity_type?: string,
    entity_id?: string,
    user_id?: string,
    details?: string
  ): Promise<ActivityLog> {
    throw new Error('Activity logging not yet implemented via IPC');
  }

  // ============ App State Operations ============

  async getAppState(key: AppStateKey): Promise<AppState | null> {
    return dbInvoke.appState.get(key);
  }

  async setAppState(key: AppStateKey, value: string, dataType?: string): Promise<AppState> {
    return dbInvoke.appState.set(key, value, dataType);
  }

  async getAppStateString(key: AppStateKey): Promise<string | null> {
    return dbInvoke.appState.getString(key);
  }

  async getAppStateBool(key: AppStateKey): Promise<boolean> {
    return dbInvoke.appState.getBool(key);
  }

  async listAppState(): Promise<AppState[]> {
    return dbInvoke.appState.listAll();
  }

  // ============ AI Agent Operations ============

  async createAIAgent(
    provider: string,
    name: string,
    display_name: string,
    is_installed?: boolean
  ): Promise<AIAgent> {
    return dbInvoke.aiAgent.create(provider, name, display_name, is_installed);
  }

  async getAIAgent(id: string): Promise<AIAgent | null> {
    return dbInvoke.aiAgent.get(id);
  }

  async listAIAgentsByProvider(provider: string): Promise<AIAgent[]> {
    return dbInvoke.aiAgent.listByProvider(provider);
  }

  async listInstalledAIAgents(): Promise<AIAgent[]> {
    return dbInvoke.aiAgent.listInstalled();
  }

  async getDefaultAIAgent(): Promise<AIAgent | null> {
    return dbInvoke.aiAgent.getDefault();
  }

  async setDefaultAIAgent(id: string): Promise<AIAgent> {
    return dbInvoke.aiAgent.setDefault(id);
  }

  async updateAIAgentInstallStatus(id: string, is_installed: boolean): Promise<AIAgent> {
    return dbInvoke.aiAgent.updateInstallStatus(id, is_installed);
  }

  async updateAIAgentAvailability(id: string, is_available: boolean): Promise<AIAgent> {
    return dbInvoke.aiAgent.updateAvailability(id, is_available);
  }

  async deleteAIAgent(id: string): Promise<void> {
    return dbInvoke.aiAgent.delete(id);
  }

  // ============ Settings Operations ============

  async getSetting(key: SettingKey): Promise<Setting | null> {
    return dbInvoke.settings.get(key);
  }

  async setSetting(key: SettingKey, value: string): Promise<Setting> {
    return dbInvoke.settings.set(key, value);
  }

  async getSettingString(key: SettingKey): Promise<string | null> {
    return dbInvoke.settings.getString(key);
  }

  async getSettingBool(key: SettingKey): Promise<boolean> {
    return dbInvoke.settings.getBool(key);
  }

  async getSettingNumber(key: SettingKey): Promise<number> {
    return dbInvoke.settings.getNumber(key);
  }

  async listSettings(): Promise<Setting[]> {
    return dbInvoke.settings.listAll();
  }

  async resetSettingsToDefaults(): Promise<void> {
    return dbInvoke.settings.resetToDefaults();
  }

  // ============ Database Health ============

  async getDatabaseSize(): Promise<number> {
    return dbInvoke.health.getSize();
  }

  async ping(): Promise<boolean> {
    return dbInvoke.health.ping();
  }
}

export const db = new DatabaseService();
