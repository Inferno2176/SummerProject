use crate::migration;

/// All migrations for CareerForges database
pub fn get_migrations() -> Vec<crate::db::migration::Migration> {
    vec![
        migration!(
            "001_initial_schema",
            "
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                avatar_url TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                deleted_at TIMESTAMP
            );

            CREATE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_created_at ON users(created_at);
            "
        ),
        migration!(
            "002_sessions_table",
            "
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                model TEXT NOT NULL,
                mode TEXT DEFAULT 'casual',
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                deleted_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_sessions_user_id ON sessions(user_id);
            CREATE INDEX idx_sessions_created_at ON sessions(created_at);
            "
        ),
        migration!(
            "003_messages_table",
            "
            CREATE TABLE messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                model TEXT,
                tokens_used INTEGER,
                created_at TIMESTAMP NOT NULL,
                deleted_at TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_messages_session_id ON messages(session_id);
            CREATE INDEX idx_messages_created_at ON messages(created_at);
            "
        ),
        migration!(
            "004_resumes_table",
            "
            CREATE TABLE resumes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                mime_type TEXT,
                parsed_content TEXT,
                hash TEXT UNIQUE,
                is_default BOOLEAN DEFAULT 0,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                deleted_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_resumes_user_id ON resumes(user_id);
            CREATE INDEX idx_resumes_is_default ON resumes(is_default);
            CREATE INDEX idx_resumes_created_at ON resumes(created_at);
            "
        ),
        migration!(
            "005_jobs_table",
            "
            CREATE TABLE jobs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                company TEXT,
                url TEXT,
                description TEXT,
                requirements TEXT,
                salary_min REAL,
                salary_max REAL,
                location TEXT,
                job_type TEXT,
                posted_date TIMESTAMP,
                status TEXT DEFAULT 'saved' CHECK(status IN ('saved', 'applied', 'rejected', 'interview')),
                match_score REAL,
                notes TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                deleted_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_jobs_user_id ON jobs(user_id);
            CREATE INDEX idx_jobs_status ON jobs(status);
            CREATE INDEX idx_jobs_created_at ON jobs(created_at);
            "
        ),
        migration!(
            "006_preferences_table",
            "
            CREATE TABLE preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                UNIQUE(user_id, key),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_preferences_user_id ON preferences(user_id);
            "
        ),
        migration!(
            "007_app_config_table",
            "
            CREATE TABLE app_config (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                value TEXT,
                type TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );

            INSERT INTO app_config (id, key, value, type, created_at, updated_at) VALUES
            ('1', 'db_version', '1', 'string', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('2', 'app_initialized', 'true', 'boolean', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            "
        ),
        migration!(
            "008_interview_sessions_table",
            "
            CREATE TABLE interview_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_type TEXT NOT NULL CHECK(session_type IN ('practice', 'realistic', 'technical', 'hr', 'behavioral', 'rapid_fire')),
                job_title TEXT,
                company TEXT,
                score REAL,
                duration_seconds INTEGER,
                feedback TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                deleted_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
            CREATE INDEX idx_interview_sessions_created_at ON interview_sessions(created_at);
            "
        ),
        migration!(
            "009_activity_logs_table",
            "
            CREATE TABLE activity_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id TEXT,
                details TEXT,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
            CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
            CREATE INDEX idx_activity_logs_action ON activity_logs(action);
            "
        ),
        migration!(
            "010_app_state_table",
            "
            CREATE TABLE app_state (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                data_type TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );

            CREATE INDEX idx_app_state_key ON app_state(key);

            INSERT INTO app_state (id, key, value, data_type, created_at, updated_at) VALUES
            ('1', 'onboarding_completed', 'false', 'boolean', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('2', 'onboarding_step', 'welcome', 'string', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('3', 'selected_provider', 'ollama', 'string', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('4', 'selected_model', 'qwen2.5:3b', 'string', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('5', 'ollama_detected', 'false', 'boolean', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('6', 'claude_cli_detected', 'false', 'boolean', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            "
        ),
        migration!(
            "011_ai_agents_table",
            "
            CREATE TABLE ai_agents (
                id TEXT PRIMARY KEY,
                provider TEXT NOT NULL CHECK(provider IN ('ollama', 'claude', 'openai', 'anthropic')),
                name TEXT NOT NULL,
                model_id TEXT,
                display_name TEXT NOT NULL,
                description TEXT,
                is_installed BOOLEAN DEFAULT 1,
                is_available BOOLEAN DEFAULT 1,
                is_default BOOLEAN DEFAULT 0,
                download_url TEXT,
                local_path TEXT,
                version TEXT,
                size_mb REAL,
                performance_tier TEXT,
                capabilities TEXT,
                last_checked TIMESTAMP,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                deleted_at TIMESTAMP
            );

            CREATE INDEX idx_ai_agents_provider ON ai_agents(provider);
            CREATE INDEX idx_ai_agents_is_installed ON ai_agents(is_installed);
            CREATE INDEX idx_ai_agents_is_default ON ai_agents(is_default);
            CREATE INDEX idx_ai_agents_created_at ON ai_agents(created_at);
            "
        ),
        migration!(
            "012_settings_table",
            "
            CREATE TABLE settings (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                data_type TEXT,
                description TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );

            CREATE INDEX idx_settings_key ON settings(key);

            INSERT INTO settings (id, key, value, data_type, description, created_at, updated_at) VALUES
            ('1', 'theme', 'dark', 'string', 'UI theme: dark or light', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('2', 'default_interview_mode', 'practice', 'string', 'Default interview mode', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('3', 'auto_save_sessions', 'true', 'boolean', 'Automatically save chat sessions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('4', 'session_timeout_minutes', '30', 'number', 'Session timeout in minutes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('5', 'enable_analytics', 'false', 'boolean', 'Enable usage analytics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('6', 'check_for_updates', 'true', 'boolean', 'Check for updates on startup', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('7', 'resume_parser_enabled', 'true', 'boolean', 'Enable resume parsing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('8', 'ai_response_streaming', 'true', 'boolean', 'Stream AI responses', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            "
        ),
    ]
}
