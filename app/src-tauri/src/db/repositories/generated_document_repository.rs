use crate::db::connection::{execute_with_params, query_row, query_rows, DbPool};
use crate::db::error::{DbError, DbResult};

use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedResume {
    pub id: String,
    pub user_id: String,
    pub job_id: String,
    pub resume_id: String,
    pub optimized_summary: Option<String>,
    pub optimized_skills: Option<String>,
    pub optimized_experience: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedCoverLetter {
    pub id: String,
    pub user_id: String,
    pub job_id: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

pub struct GeneratedDocumentRepository;

impl GeneratedDocumentRepository {
    /*
        GENERATED RESUMES
    */
    pub async fn create_resume(
        pool: &DbPool,
        user_id: &str,
        job_id: &str,
        resume_id: &str,
        summary: Option<String>,
        skills: Option<String>,
        experience: Option<String>,
    ) -> DbResult<GeneratedResume> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        execute_with_params(
            pool,
            "
            INSERT INTO generated_resumes (
                id,
                user_id,
                job_id,
                resume_id,
                optimized_summary,
                optimized_skills,
                optimized_experience,
                created_at,
                updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ",
            (
                id.clone(),
                user_id.to_string(),
                job_id.to_string(),
                resume_id.to_string(),
                summary,
                skills,
                experience,
                now.clone(),
                now.clone(),
            ),
        )
        .await?;

        Self::get_resume_by_id(pool, &id)
            .await?
            .ok_or(DbError::NotFound)
    }

    pub async fn get_resume_by_id(
        pool: &DbPool,
        id: &str,
    ) -> DbResult<Option<GeneratedResume>> {
        query_row(
            pool,
            "
            SELECT
                id, user_id, job_id, resume_id,
                optimized_summary, optimized_skills, optimized_experience,
                created_at, updated_at
            FROM generated_resumes
            WHERE id = ?1
            ",
            (id.to_string(),),
            |row| {
                Ok(GeneratedResume {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    job_id: row.get(2)?,
                    resume_id: row.get(3)?,
                    optimized_summary: row.get(4)?,
                    optimized_skills: row.get(5)?,
                    optimized_experience: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .await
    }

    pub async fn list_resumes_by_job(
        pool: &DbPool,
        job_id: &str,
    ) -> DbResult<Vec<GeneratedResume>> {
        query_rows(
            pool,
            "
            SELECT
                id, user_id, job_id, resume_id,
                optimized_summary, optimized_skills, optimized_experience,
                created_at, updated_at
            FROM generated_resumes
            WHERE job_id = ?1
            ORDER BY created_at DESC
            ",
            (job_id.to_string(),),
            |row| {
                Ok(GeneratedResume {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    job_id: row.get(2)?,
                    resume_id: row.get(3)?,
                    optimized_summary: row.get(4)?,
                    optimized_skills: row.get(5)?,
                    optimized_experience: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .await
    }

    pub async fn list_all_resumes(
        pool: &DbPool,
        user_id: &str,
    ) -> DbResult<Vec<GeneratedResume>> {
        query_rows(
            pool,
            "
            SELECT
                id, user_id, job_id, resume_id,
                optimized_summary, optimized_skills, optimized_experience,
                created_at, updated_at
            FROM generated_resumes
            WHERE user_id = ?1
            ORDER BY created_at DESC
            ",
            (user_id.to_string(),),
            |row| {
                Ok(GeneratedResume {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    job_id: row.get(2)?,
                    resume_id: row.get(3)?,
                    optimized_summary: row.get(4)?,
                    optimized_skills: row.get(5)?,
                    optimized_experience: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .await
    }

    pub async fn delete_resume(
        pool: &DbPool,
        id: &str,
    ) -> DbResult<()> {
        execute_with_params(
            pool,
            "DELETE FROM generated_resumes WHERE id = ?1",
            (id.to_string(),),
        )
        .await?;
        Ok(())
    }

    /*
        GENERATED COVER LETTERS
    */
    pub async fn create_cover_letter(
        pool: &DbPool,
        user_id: &str,
        job_id: &str,
        content: &str,
    ) -> DbResult<GeneratedCoverLetter> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        execute_with_params(
            pool,
            "
            INSERT INTO generated_cover_letters (
                id,
                user_id,
                job_id,
                content,
                created_at,
                updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ",
            (
                id.clone(),
                user_id.to_string(),
                job_id.to_string(),
                content.to_string(),
                now.clone(),
                now.clone(),
            ),
        )
        .await?;

        Self::get_cover_letter_by_id(pool, &id)
            .await?
            .ok_or(DbError::NotFound)
    }

    pub async fn get_cover_letter_by_id(
        pool: &DbPool,
        id: &str,
    ) -> DbResult<Option<GeneratedCoverLetter>> {
        query_row(
            pool,
            "
            SELECT
                id, user_id, job_id, content,
                created_at, updated_at
            FROM generated_cover_letters
            WHERE id = ?1
            ",
            (id.to_string(),),
            |row| {
                Ok(GeneratedCoverLetter {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    job_id: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .await
    }

    pub async fn list_cover_letters_by_job(
        pool: &DbPool,
        job_id: &str,
    ) -> DbResult<Vec<GeneratedCoverLetter>> {
        query_rows(
            pool,
            "
            SELECT
                id, user_id, job_id, content,
                created_at, updated_at
            FROM generated_cover_letters
            WHERE job_id = ?1
            ORDER BY created_at DESC
            ",
            (job_id.to_string(),),
            |row| {
                Ok(GeneratedCoverLetter {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    job_id: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .await
    }

    pub async fn list_all_cover_letters(
        pool: &DbPool,
        user_id: &str,
    ) -> DbResult<Vec<GeneratedCoverLetter>> {
        query_rows(
            pool,
            "
            SELECT
                id, user_id, job_id, content,
                created_at, updated_at
            FROM generated_cover_letters
            WHERE user_id = ?1
            ORDER BY created_at DESC
            ",
            (user_id.to_string(),),
            |row| {
                Ok(GeneratedCoverLetter {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    job_id: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .await
    }

    pub async fn delete_cover_letter(
        pool: &DbPool,
        id: &str,
    ) -> DbResult<()> {
        execute_with_params(
            pool,
            "DELETE FROM generated_cover_letters WHERE id = ?1",
            (id.to_string(),),
        )
        .await?;
        Ok(())
    }
}
