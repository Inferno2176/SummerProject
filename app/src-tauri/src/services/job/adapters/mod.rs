pub mod linkedin;
pub mod indeed;
pub mod greenhouse;

pub use linkedin::LinkedInAdapter as LinkedIn;
pub use indeed::IndeedAdapter as Indeed;
pub use greenhouse::GreenhouseAdapter as Greenhouse;

use crate::services::job::{DiscoveredJob, JobSearchQuery};
use crate::db::error::DbResult;
use reqwest::Client;
use regex::Regex;

pub async fn fetch_duckduckgo_jobs(site_filter: &str, query: &JobSearchQuery) -> DbResult<Vec<DiscoveredJob>> {
    let client = Client::new();
    let mut search_term = format!("{} ", site_filter);
    
    if let Some(title) = &query.title {
        search_term.push_str(&format!("\"{}\" ", title));
    }
    
    if let Some(loc) = &query.location {
        search_term.push_str(&format!("\"{}\" ", loc));
    }
    
    for skill in &query.skills {
        search_term.push_str(&format!("\"{}\" ", skill));
    }
    
    if query.remote {
        search_term.push_str("remote ");
    }

    let mut url = reqwest::Url::parse("https://html.duckduckgo.com/html/").unwrap();
    url.query_pairs_mut().append_pair("q", search_term.trim());
    url.query_pairs_mut().append_pair("df", "w"); // Past week for latest results
    
    let response = client.get(url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .send()
        .await
        .map_err(|e| crate::db::error::DbError::QueryError(format!("DuckDuckGo request failed: {}", e)))?;
        
    let html = response.text().await.map_err(|e| crate::db::error::DbError::QueryError(format!("Failed to get DuckDuckGo response text: {}", e)))?;
    
    // Simple regex-based parsing of DDG HTML
    // Looking for results: <a class="result__a" rel="noopener" href="...">Title</a>
    let result_re = Regex::new(r#"class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]+?)</a>"#).unwrap();
    
    let mut jobs = Vec::new();
    
    for cap in result_re.captures_iter(&html) {
        let raw_url = cap[1].to_string();
        let title = cap[2].to_string()
            .replace("<b>", "").replace("</b>", "")
            .replace("&amp;", "&").trim().to_string();
            
        // DuckDuckGo uses a redirect URL in the 'uddg' parameter
        let source_url = if raw_url.contains("uddg=") {
            let encoded_url = raw_url.split("uddg=").nth(1).unwrap().split('&').next().unwrap();
            // Manual decoding of common characters if urlencoding is missing
            encoded_url.replace("%3A", ":").replace("%2F", "/").replace("%3F", "?").replace("%3D", "=").replace("%26", "&")
        } else {
            raw_url
        };
        
        // Extract site name for better display
        let site_name = if source_url.contains("linkedin.com") {
            "LinkedIn"
        } else if source_url.contains("indeed.com") {
            "Indeed"
        } else if source_url.contains("greenhouse.io") || source_url.contains("lever.co") {
            "Greenhouse/Lever"
        } else {
            "Job Board"
        };

        jobs.push(DiscoveredJob {
            title,
            company: "Discovered via Search".to_string(), 
            location: query.location.clone(),
            source: site_name.to_string(),
            source_url,
            description: Some("Job found via automated search. Click link for full details.".to_string()),
            salary_min: None,
            salary_max: None,
            job_type: None,
            posted_date: Some(chrono::Utc::now().format("%Y-%m-%d").to_string()),
        });
        
        if jobs.len() >= 10 { break; }
    }
    
    Ok(jobs)
}
