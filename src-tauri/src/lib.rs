use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Mutex;
use tauri::State;

// --- Data Types ---

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub theme: String,
}

#[derive(Deserialize, Debug)]
pub struct LlmRequest {
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub system_prompt: String,
    pub user_prompt: String,
}

#[derive(Serialize, Debug)]
pub struct LlmResponse {
    pub text: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct CmdResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

// --- Project Root State (sandbox boundary) ---

pub struct ProjectRoot(pub Mutex<Option<String>>);

// --- Path Safety ---

fn validate_path_within_project(path: &str, project_root: &str) -> Result<String, String> {
    let canonical_root = fs::canonicalize(project_root)
        .map_err(|e| format!("Invalid project root: {}", e))?;
    let target = if Path::new(path).is_absolute() {
        fs::canonicalize(path).map_err(|e| format!("Invalid path: {}", e))?
    } else {
        let joined = canonical_root.join(path);
        if joined.exists() {
            fs::canonicalize(&joined).map_err(|e| format!("Invalid path: {}", e))?
        } else {
            // For new files, canonicalize parent and append filename
            if let Some(parent) = joined.parent() {
                if parent.exists() {
                    let canon_parent =
                        fs::canonicalize(parent).map_err(|e| format!("Invalid path: {}", e))?;
                    if let Some(filename) = joined.file_name() {
                        canon_parent.join(filename)
                    } else {
                        return Err("Invalid filename".to_string());
                    }
                } else {
                    return Err(format!("Parent directory does not exist: {}", parent.display()));
                }
            } else {
                return Err("Invalid path".to_string());
            }
        }
    };

    if !target.starts_with(&canonical_root) {
        return Err("Access denied: path is outside the project directory".to_string());
    }

    Ok(target.to_string_lossy().to_string())
}

fn get_project_root(state: &State<ProjectRoot>) -> Result<String, String> {
    state
        .0
        .lock()
        .map_err(|_| "Lock error".to_string())?
        .clone()
        .ok_or_else(|| "No project directory is open".to_string())
}

// --- Skip lists ---

const SKIP_DIRS: &[&str] = &[
    ".git", "node_modules", "__pycache__", ".pytest_cache", "venv", ".venv",
    "dist", "build", "out", "target", ".idea", ".vscode", ".next", ".nuxt",
    "coverage", ".gradle", "vendor", ".dart_tool", "egg-info",
];

const SKIP_FILES: &[&str] = &[
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "Cargo.lock", "poetry.lock", "go.sum",
];

// --- File System Commands ---

#[tauri::command]
fn set_project_root(path: String, state: State<ProjectRoot>) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let canonical = fs::canonicalize(p).map_err(|e| e.to_string())?;
    *state.0.lock().map_err(|_| "Lock error".to_string())? =
        Some(canonical.to_string_lossy().to_string());
    Ok(())
}

#[tauri::command]
fn read_directory(path: String, state: State<ProjectRoot>) -> Result<Vec<FileEntry>, String> {
    // For read_directory, the path IS the project root or a subdir
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    // If project root is set, validate; otherwise allow (initial open)
    if let Ok(Some(proj)) = state.0.lock().map(|g| g.clone()) {
        let canonical = fs::canonicalize(root).map_err(|e| e.to_string())?;
        let proj_canonical = fs::canonicalize(&proj).map_err(|e| e.to_string())?;
        if !canonical.starts_with(&proj_canonical) {
            return Err("Access denied: path outside project".to_string());
        }
    }
    build_tree(root, 0, 4)
}

fn build_tree(dir: &Path, depth: usize, max_depth: usize) -> Result<Vec<FileEntry>, String> {
    if depth >= max_depth {
        return Ok(vec![]);
    }

    let mut entries: Vec<FileEntry> = Vec::new();
    let read_dir = fs::read_dir(dir).map_err(|e| e.to_string())?;

    let mut items: Vec<_> = read_dir.filter_map(|e| e.ok()).collect();
    items.sort_by(|a, b| {
        let a_is_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let b_is_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        b_is_dir.cmp(&a_is_dir).then(
            a.file_name()
                .to_string_lossy()
                .to_lowercase()
                .cmp(&b.file_name().to_string_lossy().to_lowercase()),
        )
    });

    for item in items {
        let name = item.file_name().to_string_lossy().to_string();
        let file_path = item.path();
        let is_dir = item.file_type().map(|t| t.is_dir()).unwrap_or(false);

        if name.starts_with('.') && name != ".env.example" {
            continue;
        }
        if is_dir && SKIP_DIRS.contains(&name.as_str()) {
            continue;
        }
        if !is_dir && SKIP_FILES.contains(&name.as_str()) {
            continue;
        }

        let children = if is_dir {
            Some(build_tree(&file_path, depth + 1, max_depth).unwrap_or_default())
        } else {
            None
        };

        entries.push(FileEntry {
            name,
            path: file_path.to_string_lossy().to_string(),
            is_dir,
            children,
        });
    }

    Ok(entries)
}

#[tauri::command]
fn read_file(path: String, state: State<ProjectRoot>) -> Result<String, String> {
    let root = get_project_root(&state)?;
    let safe_path = validate_path_within_project(&path, &root)?;
    let p = Path::new(&safe_path);
    if !p.is_file() {
        return Err(format!("Not a file: {}", path));
    }
    let size = fs::metadata(p).map_err(|e| e.to_string())?.len();
    if size > 2_000_000 {
        return Err("File too large (>2MB)".to_string());
    }
    fs::read_to_string(p).map_err(|e| format!("Failed to read: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String, state: State<ProjectRoot>) -> Result<(), String> {
    let root = get_project_root(&state)?;
    let safe_path = validate_path_within_project(&path, &root)?;
    let p = Path::new(&safe_path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(p, content).map_err(|e| format!("Failed to write: {}", e))
}

#[tauri::command]
fn create_file(path: String, state: State<ProjectRoot>) -> Result<(), String> {
    let root = get_project_root(&state)?;
    let safe_path = validate_path_within_project(&path, &root)?;
    let p = Path::new(&safe_path);
    if p.exists() {
        return Err("File already exists".to_string());
    }
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(p, "").map_err(|e| e.to_string())
}

#[tauri::command]
fn create_directory(path: String, state: State<ProjectRoot>) -> Result<(), String> {
    let root = get_project_root(&state)?;
    let safe_path = validate_path_within_project(&path, &root)?;
    fs::create_dir_all(&safe_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_path(path: String, state: State<ProjectRoot>) -> Result<(), String> {
    let root = get_project_root(&state)?;
    let safe_path = validate_path_within_project(&path, &root)?;
    let p = Path::new(&safe_path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_path(old_path: String, new_path: String, state: State<ProjectRoot>) -> Result<(), String> {
    let root = get_project_root(&state)?;
    let safe_old = validate_path_within_project(&old_path, &root)?;
    let safe_new = validate_path_within_project(&new_path, &root)?;
    fs::rename(&safe_old, &safe_new).map_err(|e| e.to_string())
}

// --- Terminal Command (P0-5: platform-aware) ---

#[tauri::command]
fn run_terminal_command(command: String, cwd: String) -> Result<CmdResult, String> {
    let (shell, flag) = if cfg!(target_os = "windows") {
        ("cmd", "/c")
    } else {
        ("bash", "-c")
    };

    let output = Command::new(shell)
        .arg(flag)
        .arg(&command)
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("Failed to execute: {}", e))?;

    Ok(CmdResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

// --- Config Commands (legacy, kept for backward compat) ---

#[tauri::command]
fn load_config(config_path: String) -> Result<AppConfig, String> {
    let p = Path::new(&config_path);
    if p.exists() {
        let content = fs::read_to_string(p).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(AppConfig {
            provider: "gemini".to_string(),
            api_key: String::new(),
            model: "gemini-2.0-flash".to_string(),
            theme: "dark".to_string(),
        })
    }
}

#[tauri::command]
fn save_config(config_path: String, config: AppConfig) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&config_path, json).map_err(|e| e.to_string())
}

// --- LLM API Command ---

#[tauri::command]
async fn call_llm(request: LlmRequest) -> Result<LlmResponse, String> {
    let result = match request.provider.as_str() {
        "gemini" => call_gemini(&request).await,
        "groq" | "openai" => call_openai_compatible(&request).await,
        _ => Err(format!("Unknown provider: {}", request.provider)),
    };

    match result {
        Ok(text) => Ok(LlmResponse {
            text,
            success: true,
            error: None,
        }),
        Err(e) => Ok(LlmResponse {
            text: String::new(),
            success: false,
            error: Some(e),
        }),
    }
}

async fn call_gemini(req: &LlmRequest) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        req.model, req.api_key
    );

    let body = serde_json::json!({
        "system_instruction": {
            "parts": [{"text": req.system_prompt}]
        },
        "contents": [{
            "role": "user",
            "parts": [{"text": req.user_prompt}]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 8192
        }
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = resp.status();
    let resp_body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("API error {}: {}", status, resp_body));
    }

    resp_body["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Unexpected response format: {}", resp_body))
}

async fn call_openai_compatible(req: &LlmRequest) -> Result<String, String> {
    let base_url = match req.provider.as_str() {
        "groq" => "https://api.groq.com/openai/v1",
        "openai" => "https://api.openai.com/v1",
        _ => return Err(format!("Unknown provider: {}", req.provider)),
    };

    let url = format!("{}/chat/completions", base_url);

    let body = serde_json::json!({
        "model": req.model,
        "messages": [
            {"role": "system", "content": req.system_prompt},
            {"role": "user", "content": req.user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 8192
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", req.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = resp.status();
    let resp_body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("API error {}: {}", status, resp_body));
    }

    resp_body["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Unexpected response format: {}", resp_body))
}

// --- Git Commands ---

#[derive(Serialize, Debug)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub staged: Vec<GitFileChange>,
    pub unstaged: Vec<GitFileChange>,
    pub untracked: Vec<String>,
}

#[derive(Serialize, Debug)]
pub struct GitFileChange {
    pub path: String,
    pub status: String,
}

#[derive(Serialize, Debug)]
pub struct GitCommitInfo {
    pub hash: String,
    #[serde(rename = "shortHash")]
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Serialize, Debug)]
pub struct GitBranchInfo {
    pub name: String,
    pub current: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CheckpointData {
    pub id: String,
    #[serde(rename = "taskId")]
    pub task_id: String,
    pub timestamp: u64,
    pub description: String,
    pub files: Vec<CheckpointFile>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CheckpointFile {
    pub path: String,
    pub content: String,
}

#[derive(Serialize, Debug)]
pub struct SearchResultItem {
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub text: String,
    #[serde(rename = "matchLength")]
    pub match_length: usize,
}

fn run_git_cmd(args: &[&str], cwd: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Git error: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Git error: {}", stderr))
    }
}

#[tauri::command]
fn git_status(cwd: String) -> Result<GitStatus, String> {
    let branch_output = run_git_cmd(&["branch", "--show-current"], &cwd)?;
    let branch = branch_output.trim().to_string();

    let status_output = run_git_cmd(&["status", "--porcelain=v1"], &cwd)?;

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    for line in status_output.lines() {
        if line.len() < 4 { continue; }
        let index_status = line.chars().nth(0).unwrap_or(' ');
        let worktree_status = line.chars().nth(1).unwrap_or(' ');
        let file_path = line[3..].to_string();

        if index_status == '?' {
            untracked.push(file_path);
            continue;
        }

        if index_status != ' ' && index_status != '?' {
            let status = match index_status {
                'A' => "added", 'M' => "modified", 'D' => "deleted", 'R' => "renamed", _ => "modified",
            };
            staged.push(GitFileChange { path: file_path.clone(), status: status.to_string() });
        }

        if worktree_status != ' ' && worktree_status != '?' {
            let status = match worktree_status {
                'M' => "modified", 'D' => "deleted", _ => "modified",
            };
            unstaged.push(GitFileChange { path: file_path, status: status.to_string() });
        }
    }

    let mut ahead = 0i32;
    let mut behind = 0i32;
    if let Ok(rev_output) = run_git_cmd(&["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], &cwd) {
        let parts: Vec<&str> = rev_output.trim().split('\t').collect();
        if parts.len() == 2 {
            ahead = parts[0].parse().unwrap_or(0);
            behind = parts[1].parse().unwrap_or(0);
        }
    }

    Ok(GitStatus { branch, ahead, behind, staged, unstaged, untracked })
}

#[tauri::command]
fn git_commit(cwd: String, message: String, files: Vec<String>) -> Result<String, String> {
    if !files.is_empty() {
        for file in &files {
            run_git_cmd(&["add", file], &cwd)?;
        }
    }
    run_git_cmd(&["commit", "-m", &message], &cwd)
}

#[tauri::command]
fn git_diff(cwd: String, staged: bool) -> Result<String, String> {
    if staged {
        run_git_cmd(&["diff", "--cached"], &cwd)
    } else {
        run_git_cmd(&["diff"], &cwd)
    }
}

#[tauri::command]
fn git_log(cwd: String, count: usize) -> Result<Vec<GitCommitInfo>, String> {
    let format = "--pretty=format:%H%n%h%n%s%n%an%n%ai%n---";
    let count_str = format!("-{}", count);
    let output = run_git_cmd(&["log", &count_str, format], &cwd)?;

    let mut commits = Vec::new();
    let entries: Vec<&str> = output.split("---\n").collect();

    for entry in entries {
        let lines: Vec<&str> = entry.lines().collect();
        if lines.len() >= 5 {
            commits.push(GitCommitInfo {
                hash: lines[0].to_string(),
                short_hash: lines[1].to_string(),
                message: lines[2].to_string(),
                author: lines[3].to_string(),
                date: lines[4].to_string(),
            });
        }
    }

    Ok(commits)
}

#[tauri::command]
fn git_branches(cwd: String) -> Result<Vec<GitBranchInfo>, String> {
    let output = run_git_cmd(&["branch", "-a"], &cwd)?;
    let mut branches = Vec::new();

    for line in output.lines() {
        let current = line.starts_with('*');
        let name = line.trim_start_matches('*').trim().to_string();
        if !name.is_empty() && !name.contains("HEAD") {
            branches.push(GitBranchInfo { name, current });
        }
    }

    Ok(branches)
}

#[tauri::command]
fn git_checkout(cwd: String, branch: String) -> Result<(), String> {
    run_git_cmd(&["checkout", &branch], &cwd)?;
    Ok(())
}

#[tauri::command]
fn git_create_branch(cwd: String, name: String) -> Result<(), String> {
    run_git_cmd(&["checkout", "-b", &name], &cwd)?;
    Ok(())
}

#[tauri::command]
fn git_stage(cwd: String, files: Vec<String>) -> Result<(), String> {
    for file in &files {
        run_git_cmd(&["add", file], &cwd)?;
    }
    Ok(())
}

#[tauri::command]
fn git_unstage(cwd: String, files: Vec<String>) -> Result<(), String> {
    for file in &files {
        run_git_cmd(&["reset", "HEAD", file], &cwd)?;
    }
    Ok(())
}

#[tauri::command]
fn git_push(cwd: String) -> Result<String, String> {
    run_git_cmd(&["push"], &cwd)
}

#[tauri::command]
fn git_pull(cwd: String) -> Result<String, String> {
    run_git_cmd(&["pull"], &cwd)
}

// --- Search Command (uses ripgrep or fallback grep) ---

#[tauri::command]
fn search_project(
    cwd: String,
    query: String,
    regex: Option<bool>,
    case_sensitive: Option<bool>,
    whole_word: Option<bool>,
    max_results: Option<usize>,
) -> Result<Vec<SearchResultItem>, String> {
    let mut args = vec![
        "--line-number".to_string(),
        "--column".to_string(),
        "--no-heading".to_string(),
        "--color=never".to_string(),
    ];

    if regex.unwrap_or(false) {
        // ripgrep uses regex by default
    } else {
        args.push("--fixed-strings".to_string());
    }

    if !case_sensitive.unwrap_or(false) {
        args.push("--ignore-case".to_string());
    }

    if whole_word.unwrap_or(false) {
        args.push("--word-regexp".to_string());
    }

    let max = max_results.unwrap_or(1000);
    args.push(format!("--max-count={}", max));

    args.push(query.clone());
    args.push(".".to_string());

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    let output = Command::new("rg")
        .args(&arg_refs)
        .current_dir(&cwd)
        .output();

    let output = match output {
        Ok(o) => o,
        Err(_) => {
            // Fallback to grep
            let grep_output = Command::new("grep")
                .args(["-rn", "--include=*.*", &query, "."])
                .current_dir(&cwd)
                .output()
                .map_err(|e| format!("Search failed: {}", e))?;
            grep_output
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();

    for line in stdout.lines().take(max) {
        // ripgrep format: path:line:column:text
        let parts: Vec<&str> = line.splitn(4, ':').collect();
        if parts.len() >= 4 {
            let path = parts[0].trim_start_matches("./").to_string();
            let line_num: usize = parts[1].parse().unwrap_or(0);
            let col: usize = parts[2].parse().unwrap_or(0);
            let text = parts[3].to_string();

            results.push(SearchResultItem {
                path: format!("{}/{}", cwd, path),
                line: line_num,
                column: col,
                text,
                match_length: query.len(),
            });
        }
    }

    Ok(results)
}

// --- Checkpoint Commands ---

#[tauri::command]
fn create_checkpoint(cwd: String, task_id: String, description: String) -> Result<CheckpointData, String> {
    let checkpoint_dir = format!("{}/.zenith/checkpoints", cwd);
    fs::create_dir_all(&checkpoint_dir).map_err(|e| e.to_string())?;

    let id = format!("cp-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis());

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Get all tracked file contents
    let output = run_git_cmd(&["ls-files"], &cwd).unwrap_or_default();
    let mut files = Vec::new();

    for file_path in output.lines().take(200) {
        let full_path = format!("{}/{}", cwd, file_path);
        if let Ok(content) = fs::read_to_string(&full_path) {
            if content.len() < 500_000 {
                files.push(CheckpointFile {
                    path: file_path.to_string(),
                    content,
                });
            }
        }
    }

    let checkpoint = CheckpointData {
        id: id.clone(),
        task_id,
        timestamp,
        description,
        files,
    };

    let json = serde_json::to_string_pretty(&checkpoint).map_err(|e| e.to_string())?;
    let cp_file = format!("{}/{}.json", checkpoint_dir, id);
    fs::write(&cp_file, json).map_err(|e| e.to_string())?;

    Ok(checkpoint)
}

#[tauri::command]
fn restore_checkpoint(cwd: String, checkpoint_id: String) -> Result<(), String> {
    let cp_file = format!("{}/.zenith/checkpoints/{}.json", cwd, checkpoint_id);
    let content = fs::read_to_string(&cp_file).map_err(|e| format!("Checkpoint not found: {}", e))?;
    let checkpoint: CheckpointData = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    for file in &checkpoint.files {
        let full_path = format!("{}/{}", cwd, file.path);
        if let Some(parent) = Path::new(&full_path).parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&full_path, &file.content).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn list_checkpoints(cwd: String) -> Result<Vec<CheckpointData>, String> {
    let checkpoint_dir = format!("{}/.zenith/checkpoints", cwd);
    let mut checkpoints = Vec::new();

    if let Ok(entries) = fs::read_dir(&checkpoint_dir) {
        for entry in entries.flatten() {
            if entry.path().extension().map(|e| e == "json").unwrap_or(false) {
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    if let Ok(cp) = serde_json::from_str::<CheckpointData>(&content) {
                        checkpoints.push(cp);
                    }
                }
            }
        }
    }

    checkpoints.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(checkpoints)
}

// --- App Entry ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ProjectRoot(Mutex::new(None)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let log_level = if cfg!(debug_assertions) {
                log::LevelFilter::Info
            } else {
                log::LevelFilter::Warn
            };
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log_level)
                    .build(),
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_project_root,
            read_directory,
            read_file,
            write_file,
            create_file,
            create_directory,
            delete_path,
            rename_path,
            run_terminal_command,
            load_config,
            save_config,
            call_llm,
            git_status,
            git_commit,
            git_diff,
            git_log,
            git_branches,
            git_checkout,
            git_create_branch,
            git_stage,
            git_unstage,
            git_push,
            git_pull,
            search_project,
            create_checkpoint,
            restore_checkpoint,
            list_checkpoints,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
