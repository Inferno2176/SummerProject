/**
 * TypeScript models for CareerForges database entities
 * Auto-generated from Rust schema
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  model: string;
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tokens_used?: number;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  parsed_content?: string;
  hash?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  title: string;
  company?: string;
  url?: string;
  description?: string;
  requirements?: string;
  salary_min?: number;
  salary_max?: number;
  location?: string;
  job_type?: string;
  posted_date?: string;
  status: 'saved' | 'applied' | 'rejected' | 'interview';
  match_score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Preference {
  id: string;
  user_id: string;
  key: string;
  value?: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  session_type: 'practice' | 'realistic' | 'technical' | 'hr' | 'behavioral' | 'rapid_fire';
  job_title?: string;
  company?: string;
  score?: number;
  duration_seconds?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: string;
  created_at: string;
}

export interface AppConfig {
  id: string;
  key: string;
  value?: string;
  type?: string;
  created_at: string;
  updated_at: string;
}

// ============ NEW: App State ============

export interface AppState {
  id: string;
  key: string;
  value: string;
  data_type?: string;
  created_at: string;
  updated_at: string;
}

export type AppStateKey = 
  | 'onboarding_completed'
  | 'onboarding_step'
  | 'selected_provider'
  | 'selected_model'
  | 'ollama_detected'
  | 'claude_cli_detected';

// ============ NEW: AI Agent ============

export interface AIAgent {
  id: string;
  provider: 'ollama' | 'claude' | 'openai' | 'anthropic';
  name: string;
  model_id?: string;
  display_name: string;
  description?: string;
  is_installed: boolean;
  is_available: boolean;
  is_default: boolean;
  download_url?: string;
  local_path?: string;
  version?: string;
  size_mb?: number;
  performance_tier?: string;
  capabilities?: string;
  last_checked?: string;
  created_at: string;
  updated_at: string;
}

// ============ NEW: Setting ============

export interface Setting {
  id: string;
  key: string;
  value: string;
  data_type?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type SettingKey =
  | 'theme'
  | 'default_interview_mode'
  | 'auto_save_sessions'
  | 'session_timeout_minutes'
  | 'enable_analytics'
  | 'check_for_updates'
  | 'resume_parser_enabled'
  | 'ai_response_streaming';
