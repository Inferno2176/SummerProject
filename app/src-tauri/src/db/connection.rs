use rusqlite::{Connection, OptionalExtension};
use std::sync::{Arc, Mutex};
use std::path::Path;
use crate::db::error::{DbError, DbResult};

pub type DbPool = Arc<Mutex<Connection>>;

/// Initialize database connection and create pool
pub fn init_db(db_path: &Path) -> DbResult<DbPool> {
    log::info!("Initializing database at: {:?}", db_path);
    
    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)
        .map_err(|e| DbError::ConnectionError(format!("Failed to open database: {}", e)))?;

    // Enable foreign keys
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| DbError::ConnectionError(format!("Failed to enable foreign keys: {}", e)))?;

    // Performance optimizations
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA cache_size = -64000;
         PRAGMA temp_store = MEMORY;",
    ).map_err(|e| DbError::ConnectionError(format!("Failed to set pragmas: {}", e)))?;

    log::info!("Database connected successfully");
    Ok(Arc::new(Mutex::new(conn)))
}

/// Get a connection from the pool
pub fn get_connection(pool: &DbPool) -> DbResult<std::sync::MutexGuard<Connection>> {
    pool.lock().map_err(|e| DbError::ConnectionError(format!("Failed to lock database: {}", e)))
}

/// Execute a query that returns a single row
pub fn query_row<T, F>(
    pool: &DbPool,
    query: &str,
    mapper: F,
) -> DbResult<Option<T>>
where
    F: Fn(&rusqlite::Row) -> rusqlite::Result<T>,
{
    let conn = get_connection(pool)?;
    conn.query_row(query, [], mapper)
        .optional()
        .map_err(DbError::SqliteError)
}

/// Execute a query that returns multiple rows
pub fn query_rows<T, F>(
    pool: &DbPool,
    query: &str,
    mapper: F,
) -> DbResult<Vec<T>>
where
    F: Fn(&rusqlite::Row) -> rusqlite::Result<T>,
{
    let conn = get_connection(pool)?;
    let mut stmt = conn.prepare(query)?;
    let rows = stmt
        .query_map([], mapper)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

/// Execute without returning rows (INSERT, UPDATE, DELETE)
pub fn execute(pool: &DbPool, query: &str) -> DbResult<usize> {
    let conn = get_connection(pool)?;
    conn.execute(query, []).map_err(DbError::SqliteError)
}

/// Execute with parameters
pub fn execute_with_params(
    pool: &DbPool,
    query: &str,
    params: &[&dyn rusqlite::ToSql],
) -> DbResult<usize> {
    let conn = get_connection(pool)?;
    conn.execute(query, params).map_err(DbError::SqliteError)
}

/// Get last inserted row ID
pub fn last_insert_rowid(pool: &DbPool) -> DbResult<i64> {
    let conn = get_connection(pool)?;
    Ok(conn.last_insert_rowid())
}

/// Execute a transaction
pub fn transaction<F, T>(pool: &DbPool, f: F) -> DbResult<T>
where
    F: FnOnce(&rusqlite::Connection) -> DbResult<T>,
{
    let mut conn = get_connection(pool)?;
    let tx = conn
        .transaction()
        .map_err(|e| DbError::TransactionError(format!("Failed to start transaction: {}", e)))?;
    
    match f(&tx) {
        Ok(result) => {
            tx.commit()
                .map_err(|e| DbError::TransactionError(format!("Failed to commit transaction: {}", e)))?;
            Ok(result)
        }
        Err(e) => {
            let _ = tx.rollback();
            Err(e)
        }
    }
}

/// Get database size
pub fn get_db_size(pool: &DbPool) -> DbResult<i64> {
    query_row(pool, "SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size();", |row| {
        row.get(0)
    })?
    .ok_or(DbError::QueryError("Failed to get database size".into()))
}
