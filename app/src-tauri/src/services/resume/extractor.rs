use crate::db::error::{DbError, DbResult};
use std::path::Path;

pub async fn extract_resume_text(file_path: &str) -> DbResult<String> {
    if file_path.is_empty() {
        return Err(DbError::QueryError("File path is empty".into()));
    }

    let path = Path::new(file_path);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "pdf" => extract_pdf(file_path),
        "docx" | "doc" => extract_docx(file_path),
        _ => Err(DbError::QueryError(format!("Unsupported file type: {}", ext))),
    }
}

fn extract_pdf(file_path: &str) -> DbResult<String> {
    let bytes = std::fs::read(file_path)
        .map_err(|e| DbError::QueryError(format!("Failed to read PDF: {}", e)))?;

    let text = pdf_extract::extract_text_from_mem(&bytes)
        .map_err(|e| DbError::QueryError(format!("Failed to extract PDF text: {}", e)))?;

    let cleaned = text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    if cleaned.is_empty() {
        return Err(DbError::QueryError("PDF appears to be empty or image-only".into()));
    }

    Ok(cleaned)
}

fn extract_docx(file_path: &str) -> DbResult<String> {
    let bytes = std::fs::read(file_path)
        .map_err(|e| DbError::QueryError(format!("Failed to read DOCX: {}", e)))?;

    let cursor = std::io::Cursor::new(bytes);
    let mut zip = zip::ZipArchive::new(cursor)
        .map_err(|e| DbError::QueryError(format!("Failed to open DOCX zip: {}", e)))?;

    let mut xml_content = String::new();
    for i in 0..zip.len() {
        let mut file = zip.by_index(i)
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        if file.name() == "word/document.xml" {
            use std::io::Read;
            file.read_to_string(&mut xml_content)
                .map_err(|e| DbError::QueryError(e.to_string()))?;
            break;
        }
    }

    if xml_content.is_empty() {
        return Err(DbError::QueryError("DOCX document.xml not found".into()));
    }

    // Strip XML tags, keep text
    let text = strip_xml_tags(&xml_content);
    let cleaned = text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    Ok(cleaned)
}

fn strip_xml_tags(xml: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    let mut in_space = false;

    for ch in xml.chars() {
        match ch {
            '<' => { in_tag = true; }
            '>' => {
                in_tag = false;
                result.push(' ');
                in_space = true;
            }
            _ if !in_tag => {
                if ch == ' ' || ch == '\n' {
                    if !in_space {
                        result.push(ch);
                        in_space = true;
                    }
                } else {
                    result.push(ch);
                    in_space = false;
                }
            }
            _ => {}
        }
    }

    result
}