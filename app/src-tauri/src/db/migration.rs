use rusqlite::Connection;
use crate::db::error::{DbError, DbResult};
use chrono::Utc;

#[derive(Debug, Clone)]
pub struct Migration {
    pub name: String,
    pub sql: String,
}

pub struct MigrationRunner;

impl MigrationRunner {
    /// Create migrations table if it doesn't exist
    pub fn init_migrations_table(conn: &Connection) -> DbResult<()> {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                executed_at TIMESTAMP NOT NULL
            );",
            [],
        )?;
        Ok(())
    }

    /// Get list of executed migrations
    pub fn get_executed_migrations(conn: &Connection) -> DbResult<Vec<String>> {
        let mut stmt = conn.prepare("SELECT name FROM _migrations ORDER BY id")?;
        let migrations = stmt
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;
        Ok(migrations)
    }

    /// Run pending migrations
    pub fn run_migrations(conn: &mut Connection, migrations: Vec<Migration>) -> DbResult<()> {
        log::info!("Starting migration runner...");
        
        Self::init_migrations_table(conn)?;
        let executed = Self::get_executed_migrations(conn)?;

        for migration in migrations {
            if executed.contains(&migration.name) {
                log::debug!("Migration already executed: {}", migration.name);
                continue;
            }

            log::info!("Running migration: {}", migration.name);
            
            let tx = conn.transaction()
                .map_err(|e| DbError::MigrationError(format!("Failed to start transaction: {}", e)))?;

            match tx.execute_batch(&migration.sql) {
                Ok(_) => {
                    tx.execute(
                        "INSERT INTO _migrations (name, executed_at) VALUES (?, ?)",
                        [&migration.name, &Utc::now().to_rfc3339()],
                    )?;
                    tx.commit()
                        .map_err(|e| DbError::MigrationError(format!("Failed to commit migration: {}", e)))?;
                    log::info!("Migration completed: {}", migration.name);
                }
                Err(e) => {
                    tx.rollback().ok();
                    return Err(DbError::MigrationError(format!(
                        "Migration failed {}: {}",
                        migration.name, e
                    )));
                }
            }
        }

        log::info!("All migrations completed successfully");
        Ok(())
    }

    /// Reset database (use with caution!)
    pub fn reset_database(conn: &Connection) -> DbResult<()> {
        log::warn!("Resetting database...");
        
        // Get all tables
        let mut stmt = conn.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )?;
        
        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;

        // Drop all tables
        for table in tables {
            conn.execute(&format!("DROP TABLE IF EXISTS {}", table), [])?;
        }

        // Reset migrations table
        conn.execute("DELETE FROM _migrations", [])?;
        
        log::info!("Database reset completed");
        Ok(())
    }
}

/// Define migration constant
#[macro_export]
macro_rules! migration {
    ($name:expr, $sql:expr) => {
        $crate::db::migration::Migration {
            name: $name.to_string(),
            sql: $sql.to_string(),
        }
    };
}
