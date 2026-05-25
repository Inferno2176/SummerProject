use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    SqliteError(#[from] rusqlite::Error),

    #[error("Migration error: {0}")]
    MigrationError(String),

    #[error("Connection error: {0}")]
    ConnectionError(String),

    #[error("Transaction error: {0}")]
    TransactionError(String),

    #[error("Query error: {0}")]
    QueryError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("UUID error: {0}")]
    UuidError(String),

    #[error("Not found")]
    NotFound,

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

pub type DbResult<T> = Result<T, DbError>;
