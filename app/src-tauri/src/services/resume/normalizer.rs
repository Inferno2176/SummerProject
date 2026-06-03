pub fn normalize_resume_text(
    text: &str,
) -> String {
    text
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}