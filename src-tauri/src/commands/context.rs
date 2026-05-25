use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Deserialize, Debug)]
pub struct ContextRequest {
    pub project_path: String,
    pub file_paths: Option<Vec<String>>,
    pub include_git_diff: Option<bool>,
    pub include_git_log: Option<bool>,
    pub include_tree: Option<bool>,
    #[allow(dead_code)]
    pub include_diagnostics: Option<bool>,
    pub terminal_output: Option<String>,
    pub selected_text: Option<String>,
    pub custom_instructions: Option<String>,
    pub project_rules: Option<String>,
    pub max_file_size: Option<u64>,
}

#[derive(Serialize, Debug)]
pub struct BuiltContext {
    pub context_text: String,
    pub token_estimate: usize,
    pub file_count: usize,
}

#[tauri::command]
pub fn build_context(request: ContextRequest) -> Result<BuiltContext, String> {
    let mut parts: Vec<String> = Vec::new();
    let max_size = request.max_file_size.unwrap_or(500_000);
    let mut file_count = 0usize;

    if let Some(instructions) = &request.custom_instructions {
        if !instructions.is_empty() {
            parts.push(format!("# Custom Instructions\n{}\n", instructions));
        }
    }

    if let Some(rules) = &request.project_rules {
        if !rules.is_empty() {
            parts.push(format!("# Project Rules\n{}\n", rules));
        }
    }

    // Auto-load project rules if not provided
    if request.project_rules.is_none() {
        let rules_paths = [
            format!("{}/.zenith/rules.md", request.project_path),
            format!("{}/.cursorrules", request.project_path),
            format!("{}/.cursorrc", request.project_path),
            format!("{}/.zenith/instructions.md", request.project_path),
        ];
        for rules_path in &rules_paths {
            if let Ok(content) = fs::read_to_string(rules_path) {
                parts.push(format!("# Project Rules\n{}\n", content));
                break;
            }
        }
    }

    if request.include_tree.unwrap_or(false) {
        let tree = build_simple_tree(&request.project_path, 3);
        parts.push(format!("# Project Structure\n```\n{}```\n", tree));
    }

    if let Some(file_paths) = &request.file_paths {
        for file_path in file_paths {
            let full_path = if Path::new(file_path).is_absolute() {
                file_path.clone()
            } else {
                format!("{}/{}", request.project_path, file_path)
            };

            let path = Path::new(&full_path);
            if !path.is_file() {
                continue;
            }

            let size = path.metadata().map(|m| m.len()).unwrap_or(0);
            if size > max_size {
                parts.push(format!("# File: {} (too large, {} bytes)\n", file_path, size));
                continue;
            }

            match fs::read_to_string(path) {
                Ok(content) => {
                    parts.push(format!("# File: {}\n```\n{}\n```\n", file_path, content));
                    file_count += 1;
                }
                Err(e) => {
                    parts.push(format!("# File: {} (error reading: {})\n", file_path, e));
                }
            }
        }
    }

    if let Some(selected) = &request.selected_text {
        if !selected.is_empty() {
            parts.push(format!("# Selected Code\n```\n{}\n```\n", selected));
        }
    }

    if request.include_git_diff.unwrap_or(false) {
        if let Ok(diff) = run_cmd("git", &["diff", "--stat", "--patch"], &request.project_path) {
            if !diff.is_empty() {
                let truncated = if diff.len() > 10000 {
                    format!("{}...\n[truncated]", &diff[..10000])
                } else {
                    diff
                };
                parts.push(format!("# Git Diff (uncommitted changes)\n```\n{}\n```\n", truncated));
            }
        }
    }

    if request.include_git_log.unwrap_or(false) {
        if let Ok(log) = run_cmd("git", &["log", "--oneline", "-10"], &request.project_path) {
            if !log.is_empty() {
                parts.push(format!("# Recent Git Commits\n```\n{}\n```\n", log));
            }
        }
        if let Ok(branch) = run_cmd("git", &["branch", "--show-current"], &request.project_path) {
            parts.push(format!("Current branch: {}\n", branch.trim()));
        }
    }

    if let Some(terminal) = &request.terminal_output {
        if !terminal.is_empty() {
            parts.push(format!("# Terminal Output\n```\n{}\n```\n", terminal));
        }
    }

    let context_text = parts.join("\n");
    let token_estimate = context_text.len() / 4;

    Ok(BuiltContext {
        context_text,
        token_estimate,
        file_count,
    })
}

#[tauri::command]
pub fn read_multiple_files(
    project_path: String,
    file_paths: Vec<String>,
    max_size: Option<u64>,
) -> Result<Vec<(String, String)>, String> {
    let max = max_size.unwrap_or(500_000);
    let mut results = Vec::new();

    for file_path in file_paths {
        let full_path = if Path::new(&file_path).is_absolute() {
            file_path.clone()
        } else {
            format!("{}/{}", project_path, file_path)
        };

        let path = Path::new(&full_path);
        if !path.is_file() {
            results.push((file_path, "[File not found]".to_string()));
            continue;
        }

        let size = path.metadata().map(|m| m.len()).unwrap_or(0);
        if size > max {
            results.push((file_path, format!("[File too large: {} bytes]", size)));
            continue;
        }

        match fs::read_to_string(path) {
            Ok(content) => results.push((file_path, content)),
            Err(e) => results.push((file_path, format!("[Error: {}]", e))),
        }
    }

    Ok(results)
}

fn build_simple_tree(root_path: &str, max_depth: usize) -> String {
    let skip_dirs: Vec<&str> = vec![
        ".git", "node_modules", "__pycache__", "target", "dist", "build",
        ".next", ".nuxt", "coverage", ".venv", "venv",
    ];

    fn recurse(dir: &Path, prefix: &str, depth: usize, max_depth: usize, skip: &[&str]) -> String {
        if depth >= max_depth {
            return String::new();
        }

        let mut result = String::new();
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return result,
        };

        let mut items: Vec<_> = entries.filter_map(|e| e.ok()).collect();
        items.sort_by(|a, b| {
            let a_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
            let b_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
            b_dir.cmp(&a_dir).then(
                a.file_name().to_string_lossy().to_lowercase()
                    .cmp(&b.file_name().to_string_lossy().to_lowercase())
            )
        });

        for item in items {
            let name = item.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }

            let is_dir = item.file_type().map(|t| t.is_dir()).unwrap_or(false);
            if is_dir && skip.contains(&name.as_str()) {
                continue;
            }

            if is_dir {
                result.push_str(&format!("{}{}/\n", prefix, name));
                result.push_str(&recurse(&item.path(), &format!("{}  ", prefix), depth + 1, max_depth, skip));
            } else {
                result.push_str(&format!("{}{}\n", prefix, name));
            }
        }

        result
    }

    recurse(Path::new(root_path), "", 0, max_depth, &skip_dirs)
}

fn run_cmd(cmd: &str, args: &[&str], cwd: &str) -> Result<String, String> {
    let output = Command::new(cmd)
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Command error: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
