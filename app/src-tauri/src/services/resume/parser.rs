use regex::Regex;
use serde::{Deserialize, Serialize};
use crate::db::error::DbResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkExperience {
    pub title: Option<String>,
    pub company: Option<String>,
    pub duration: Option<String>,

    #[serde(default)]
    pub bullets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Education {
    pub degree: Option<String>,
    pub institution: Option<String>,
    pub year: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedResume {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub location: Option<String>,
    pub summary: Option<String>,

    #[serde(default)]
    pub skills: Vec<String>,

    #[serde(default)]
    pub experience: Vec<WorkExperience>,

    #[serde(default)]
    pub education: Vec<Education>,

    #[serde(default)]
    pub certifications: Vec<String>,

    #[serde(default)]
    pub languages: Vec<String>,
}

pub async fn parse_resume_text(text: &str, _model: &str) -> DbResult<ParsedResume> {
    let normalized = normalize_resume_text(text);
    let lines: Vec<&str> = normalized.lines().collect();

    let email = extract_email(&normalized);
    let phone = extract_phone(&normalized);
    let location = extract_location(&lines);
    let name = extract_name(&lines, email.as_deref(), phone.as_deref());
    let summary = extract_summary(&lines);
    let skills = extract_skills(&normalized);
    let experience = extract_experience(&normalized);
    let education = extract_education(&normalized);
    let certifications = extract_section_list(&normalized, &[
        "certifications",
        "certification",
        "licenses",
        "license",
    ]);
    let languages = extract_section_list(&normalized, &["languages", "language"]);

    Ok(ParsedResume {
        name,
        email,
        phone,
        location,
        summary,
        skills,
        experience,
        education,
        certifications,
        languages,
    })
}

fn normalize_resume_text(text: &str) -> String {
    text
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

fn extract_email(text: &str) -> Option<String> {
    let re = Regex::new(r"(?i)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}").unwrap();
    re.find(text).map(|m| m.as_str().to_string())
}

fn extract_phone(text: &str) -> Option<String> {
    let re = Regex::new(r"(?x)(?:\+?[0-9]{1,3}[ \-]?)?(?:\(?[0-9]{3}\)?[ \-]?[0-9]{3}[ \-]?[0-9]{4}|[0-9]{2,4}[ \-][0-9]{3,4}[ \-][0-9]{3,4})").unwrap();
    re.find(text).map(|m| m.as_str().to_string())
}

fn extract_name(lines: &[&str], email: Option<&str>, phone: Option<&str>) -> Option<String> {
    for line in lines.iter().take(5) {
        let lower = line.to_lowercase();
        if lower.contains("resume") || lower.contains("curriculum") || lower.contains("objective") {
            continue;
        }
        if Some(*line) == email || Some(*line) == phone {
            continue;
        }
        if extract_section_text_by_keywords(&[*line], &["summary", "profile", "objective"]).is_some() {
            continue;
        }
        if line.split_whitespace().count() <= 5 {
            return Some(line.to_string());
        }
    }
    None
}

fn extract_location(lines: &[&str]) -> Option<String> {
    for line in lines.iter().take(8) {
        let lower = line.to_lowercase();
        if lower.contains("@") || lower.contains("phone") || lower.contains("email") {
            continue;
        }
        if line.contains(',') && line.split(',').count() <= 3 {
            return Some(line.to_string());
        }
    }
    None
}

fn extract_summary(lines: &[&str]) -> Option<String> {
    if let Some(section) = extract_section_text_by_keywords(lines, &["summary", "professional summary", "profile", "about", "objective"]) {
        return Some(section.trim().to_string());
    }

    let mut candidate = Vec::new();
    for line in lines.iter().skip(1) {
        let lower = line.to_lowercase();
        if is_heading_line(line) || lower.contains("experience") || lower.contains("education") || lower.contains("skills") {
            break;
        }
        if !line.is_empty() {
            candidate.push(*line);
        }
        if candidate.len() >= 4 {
            break;
        }
    }

    if candidate.is_empty() {
        None
    } else {
        Some(candidate.join(" "))
    }
}

fn extract_skills(text: &str) -> Vec<String> {
    if let Some(section) = extract_section_text_by_keywords(&text.lines().collect::<Vec<_>>(), &["skills", "technical skills", "key skills"]) {
        return split_list_items(&section);
    }

    text.lines()
        .filter_map(|line| {
            let lower = line.to_lowercase();
            if lower.contains("skills") && line.contains(":") {
                return Some(line.split_once(':')?.1.to_string());
            }
            None
        })
        .flat_map(|line| split_list_items(&line))
        .collect()
}

fn extract_experience(text: &str) -> Vec<WorkExperience> {
    if let Some(section) = extract_section_text_by_keywords(&text.lines().collect::<Vec<_>>(), &["experience", "work experience", "professional experience", "employment"]) {
        return parse_experience_section(&section);
    }
    Vec::new()
}

fn extract_education(text: &str) -> Vec<Education> {
    if let Some(section) = extract_section_text_by_keywords(&text.lines().collect::<Vec<_>>(), &["education", "academic background", "education & training"]) {
        return parse_education_section(&section);
    }
    Vec::new()
}

fn extract_section_list(text: &str, keywords: &[&str]) -> Vec<String> {
    if let Some(section) = extract_section_text_by_keywords(&text.lines().collect::<Vec<_>>(), keywords) {
        return split_list_items(&section);
    }
    Vec::new()
}

fn extract_section_text_by_keywords(lines: &[&str], keywords: &[&str]) -> Option<String> {
    for (idx, line) in lines.iter().enumerate() {
        let normalized = line.to_lowercase();
        for keyword in keywords {
            if normalized.contains(keyword) && normalized.split_whitespace().count() <= 6 {
                let mut section_lines = Vec::new();
                for next_line in lines.iter().skip(idx + 1) {
                    if is_heading_line(next_line) {
                        break;
                    }
                    section_lines.push(*next_line);
                }
                return Some(section_lines.join("\n"));
            }
        }
    }
    None
}

fn is_heading_line(line: &str) -> bool {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return true;
    }
    let lower = trimmed.to_lowercase();
    let headings = [
        "experience",
        "work experience",
        "professional experience",
        "education",
        "skills",
        "certifications",
        "languages",
        "summary",
        "profile",
        "objective",
        "projects",
        "achievements",
    ];
    headings.iter().any(|heading| lower.contains(heading))
}

fn split_list_items(section: &str) -> Vec<String> {
    section
        .lines()
        .flat_map(|line| {
            let trimmed = line.trim().trim_start_matches(|c: char| c == '-' || c == '*' || c == '•' || c == '‑' || c == '•');
            if trimmed.is_empty() {
                None
            } else if trimmed.contains(',') {
                Some(trimmed.split(',').map(str::trim).filter(|s| !s.is_empty()).map(String::from).collect::<Vec<_>>())
            } else {
                Some(vec![trimmed.to_string()])
            }
        })
        .flatten()
        .collect()
}

fn parse_experience_section(section: &str) -> Vec<WorkExperience> {
    let blocks = section.split("\n\n").collect::<Vec<_>>();
    blocks
        .into_iter()
        .filter_map(|block| {
            let lines = block.lines().map(str::trim).filter(|l| !l.is_empty()).collect::<Vec<_>>();
            if lines.is_empty() {
                return None;
            }
            let first = lines[0];
            let (title, company, duration) = parse_title_company_duration(first);
            let bullets = lines
                .iter()
                .skip(1)
                .filter(|line| !line.to_lowercase().starts_with("company") && !line.to_lowercase().starts_with("duration"))
                .map(|line| line.trim_start_matches(|c: char| c == '-' || c == '*' || c == '•' || c == '‑').trim().to_string())
                .filter(|line| !line.is_empty())
                .collect::<Vec<_>>();
            Some(WorkExperience { title, company, duration, bullets })
        })
        .collect()
}

fn parse_education_section(section: &str) -> Vec<Education> {
    section
        .split("\n\n")
        .filter_map(|block| {
            let lines = block.lines().map(str::trim).filter(|l| !l.is_empty()).collect::<Vec<_>>();
            if lines.is_empty() {
                return None;
            }
            let first = lines[0];
            let degree = Some(first.to_string());
            let (institution, year) = parse_institution_year(first);
            Some(Education { degree, institution, year })
        })
        .collect()
}

fn parse_title_company_duration(line: &str) -> (Option<String>, Option<String>, Option<String>) {
    let parts = line.split(|c| c == '|' || c == '@' || c == '•' || c == '·' || c == '-').map(str::trim).filter(|s| !s.is_empty()).collect::<Vec<_>>();
    let mut title = None;
    let mut company = None;
    let mut duration = None;

    if parts.len() >= 1 {
        title = Some(parts[0].to_string());
    }
    if parts.len() == 2 {
        company = Some(parts[1].to_string());
    } else if parts.len() >= 3 {
        company = Some(parts[1].to_string());
        duration = Some(parts[2].to_string());
    }

    (title, company, duration)
}

fn parse_institution_year(line: &str) -> (Option<String>, Option<String>) {
    let year_re = Regex::new(r"(19|20)\d{2}").unwrap();
    let year = year_re.find(line).map(|m| m.as_str().to_string());
    let cleaned = year_re.replace_all(line, "").trim().trim_end_matches(|c: char| c == ',' || c == '-').trim().to_string();
    let institution = if cleaned.is_empty() { None } else { Some(cleaned) };
    (institution, year)
}
