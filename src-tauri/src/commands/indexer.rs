use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

const SKIP_DIRS: &[&str] = &[
    ".git", "node_modules", "__pycache__", ".pytest_cache", "venv", ".venv",
    "dist", "build", "out", "target", ".idea", ".vscode", ".next", ".nuxt",
    "coverage", ".gradle", "vendor", ".dart_tool", "egg-info", ".zenith",
];

const TEXT_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "rs", "py", "go", "java", "c", "cpp", "h", "hpp",
    "css", "scss", "less", "html", "json", "yaml", "yml", "toml", "md", "txt",
    "sh", "bash", "zsh", "fish", "sql", "graphql", "proto", "xml", "svg",
    "vue", "svelte", "astro", "tf", "hcl", "dockerfile", "makefile",
];

#[derive(Serialize, Clone, Debug)]
pub struct IndexedFile {
    pub path: String,
    pub relative_path: String,
    pub size: u64,
    pub extension: String,
    pub line_count: usize,
}

#[derive(Serialize, Clone, Debug)]
pub struct ProjectIndex {
    pub files: Vec<IndexedFile>,
    pub total_files: usize,
    pub total_lines: usize,
    pub total_size: u64,
    pub languages: HashMap<String, usize>,
    pub file_tree: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct SymbolInfo {
    pub name: String,
    pub kind: String,
    pub path: String,
    pub line: usize,
}

#[tauri::command]
pub fn index_project(project_path: String) -> Result<ProjectIndex, String> {
    let root = Path::new(&project_path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", project_path));
    }

    let mut files = Vec::new();
    let mut total_lines = 0usize;
    let mut total_size = 0u64;
    let mut languages: HashMap<String, usize> = HashMap::new();
    let mut tree_parts: Vec<String> = Vec::new();

    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            if name.starts_with('.') && e.depth() > 0 {
                return false;
            }
            if e.file_type().is_dir() {
                return !SKIP_DIRS.contains(&name.as_ref());
            }
            true
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if entry.file_type().is_dir() {
            continue;
        }

        let path = entry.path();
        let rel_path = path
            .strip_prefix(root)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        let ext = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        total_size += size;

        let line_count = if TEXT_EXTENSIONS.contains(&ext.as_str()) && size < 2_000_000 {
            match fs::read_to_string(path) {
                Ok(content) => content.lines().count(),
                Err(_) => 0,
            }
        } else {
            0
        };

        total_lines += line_count;

        let lang = ext_to_language(&ext);
        if !lang.is_empty() {
            *languages.entry(lang).or_insert(0) += line_count;
        }

        let depth = entry.depth();
        let indent = "  ".repeat(depth.saturating_sub(1));
        let name = entry.file_name().to_string_lossy().to_string();
        tree_parts.push(format!("{}{}", indent, name));

        files.push(IndexedFile {
            path: path.to_string_lossy().to_string(),
            relative_path: rel_path,
            size,
            extension: ext,
            line_count,
        });
    }

    let total_files = files.len();

    Ok(ProjectIndex {
        files,
        total_files,
        total_lines,
        total_size,
        languages,
        file_tree: tree_parts.join("\n"),
    })
}

#[tauri::command]
pub fn extract_symbols(project_path: String) -> Result<Vec<SymbolInfo>, String> {
    let root = Path::new(&project_path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", project_path));
    }

    let mut symbols = Vec::new();
    let fn_patterns = [
        (regex::Regex::new(r"(?m)^(?:export\s+)?(?:async\s+)?function\s+(\w+)").unwrap(), "function"),
        (regex::Regex::new(r"(?m)^(?:export\s+)?(?:default\s+)?class\s+(\w+)").unwrap(), "class"),
        (regex::Regex::new(r"(?m)^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(").unwrap(), "function"),
        (regex::Regex::new(r"(?m)^(?:export\s+)?interface\s+(\w+)").unwrap(), "interface"),
        (regex::Regex::new(r"(?m)^(?:export\s+)?type\s+(\w+)").unwrap(), "type"),
        (regex::Regex::new(r"(?m)^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)").unwrap(), "function"),
        (regex::Regex::new(r"(?m)^(?:pub\s+)?struct\s+(\w+)").unwrap(), "struct"),
        (regex::Regex::new(r"(?m)^(?:pub\s+)?enum\s+(\w+)").unwrap(), "enum"),
        (regex::Regex::new(r"(?m)^(?:pub\s+)?trait\s+(\w+)").unwrap(), "trait"),
        (regex::Regex::new(r"(?m)^def\s+(\w+)").unwrap(), "function"),
        (regex::Regex::new(r"(?m)^class\s+(\w+)").unwrap(), "class"),
    ];

    for entry in WalkDir::new(root)
        .follow_links(false)
        .max_depth(6)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            if name.starts_with('.') && e.depth() > 0 {
                return false;
            }
            if e.file_type().is_dir() {
                return !SKIP_DIRS.contains(&name.as_ref());
            }
            true
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if entry.file_type().is_dir() {
            continue;
        }

        let path = entry.path();
        let ext = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        if !TEXT_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }

        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        if size > 500_000 {
            continue;
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let rel_path = path
            .strip_prefix(root)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        for (pattern, kind) in &fn_patterns {
            for mat in pattern.find_iter(&content) {
                let line = content[..mat.start()].lines().count() + 1;
                if let Some(caps) = pattern.captures(&content[mat.start()..]) {
                    if let Some(name) = caps.get(1) {
                        symbols.push(SymbolInfo {
                            name: name.as_str().to_string(),
                            kind: kind.to_string(),
                            path: rel_path.clone(),
                            line,
                        });
                    }
                }
            }
        }
    }

    Ok(symbols)
}

fn ext_to_language(ext: &str) -> String {
    match ext {
        "ts" | "tsx" => "TypeScript".to_string(),
        "js" | "jsx" => "JavaScript".to_string(),
        "rs" => "Rust".to_string(),
        "py" => "Python".to_string(),
        "go" => "Go".to_string(),
        "java" => "Java".to_string(),
        "c" | "h" => "C".to_string(),
        "cpp" | "hpp" | "cc" => "C++".to_string(),
        "css" | "scss" | "less" => "CSS".to_string(),
        "html" => "HTML".to_string(),
        "json" => "JSON".to_string(),
        "yaml" | "yml" => "YAML".to_string(),
        "toml" => "TOML".to_string(),
        "md" => "Markdown".to_string(),
        "sql" => "SQL".to_string(),
        "sh" | "bash" | "zsh" => "Shell".to_string(),
        "vue" => "Vue".to_string(),
        "svelte" => "Svelte".to_string(),
        _ => String::new(),
    }
}
