use crate::db::connection::DbPool;
use crate::db::error::DbResult;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resume {
    pub id: String,
    pub user_id: String,

    pub filename: String,
    pub file_path: String,
    pub raw_text: Option<String>,

    pub parsed_json: Option<String>,

    pub status: String,

    pub file_size: Option<i64>,

    pub created_at: String,
    pub updated_at: String,
}

impl Resume {
    pub fn new(
        user_id: String,
        filename: String,
        file_path: String,
        file_size: Option<i64>,
    ) -> Self {
        let now = Utc::now().to_rfc3339();

        Self {
            id: Uuid::new_v4().to_string(),
            user_id,
            filename,
            file_path,
            file_size,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}