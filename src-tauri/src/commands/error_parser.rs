use regex::Regex;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct ParsedError {
    pub has_error: bool,
    pub error_type: String,
    pub error_message: String,
    pub stack_trace: Option<ParsedStackTrace>,
    pub diagnostics: Vec<TerminalDiagnostic>,
}

#[derive(Serialize, Clone, Debug)]
pub struct ParsedStackTrace {
    pub message: String,
    pub trace_type: String,
    pub frames: Vec<StackFrame>,
}

#[derive(Serialize, Clone, Debug)]
pub struct StackFrame {
    pub file: String,
    pub line: usize,
    pub column: Option<usize>,
    pub function_name: Option<String>,
    pub raw: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct TerminalDiagnostic {
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub message: String,
    pub severity: String,
    pub source: String,
    pub code: Option<String>,
}

#[tauri::command]
pub fn parse_terminal_errors(
    output: String,
    project_path: String,
) -> Result<ParsedError, String> {
    let error_info = detect_error(&output);
    let stack_trace = parse_stack_trace(&output);
    let diagnostics = extract_diagnostics(&output, &project_path);

    Ok(ParsedError {
        has_error: error_info.0,
        error_type: error_info.1,
        error_message: error_info.2,
        stack_trace,
        diagnostics,
    })
}

fn detect_error(output: &str) -> (bool, String, String) {
    let patterns: Vec<(&str, Regex)> = vec![
        ("package_manager", Regex::new(r"(?i)npm ERR!|yarn error|pnpm ERR").unwrap()),
        ("missing_module", Regex::new(r"(?i)ModuleNotFoundError|Cannot find module").unwrap()),
        ("syntax_error", Regex::new(r"(?i)SyntaxError").unwrap()),
        ("type_error", Regex::new(r"(?i)TypeError").unwrap()),
        ("reference_error", Regex::new(r"(?i)ReferenceError").unwrap()),
        ("file_not_found", Regex::new(r"(?i)ENOENT|no such file").unwrap()),
        ("permission_denied", Regex::new(r"(?i)EACCES|permission denied").unwrap()),
        ("connection_error", Regex::new(r"(?i)ECONNREFUSED|connection refused").unwrap()),
        ("process_killed", Regex::new(r"(?i)SIGKILL|SIGTERM|killed").unwrap()),
        ("memory_error", Regex::new(r"(?i)out of memory|heap").unwrap()),
        ("build_error", Regex::new(r"(?i)compilation failed|build failed").unwrap()),
        ("test_failure", Regex::new(r"(?i)test failed|tests? failing").unwrap()),
        ("rust_error", Regex::new(r"(?i)cargo error|rustc error|error\[E\d+\]").unwrap()),
        ("python_error", Regex::new(r"(?i)traceback|exception").unwrap()),
    ];

    for (error_type, pattern) in &patterns {
        if pattern.is_match(output) {
            let error_line = output
                .lines()
                .find(|l| pattern.is_match(l))
                .unwrap_or(output.lines().next().unwrap_or(""))
                .trim()
                .to_string();
            return (true, error_type.to_string(), error_line);
        }
    }

    (false, String::new(), String::new())
}

fn parse_stack_trace(output: &str) -> Option<ParsedStackTrace> {
    let js_pattern = Regex::new(r"at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?").unwrap();
    let python_pattern = Regex::new(r#"File "(.+?)", line (\d+)(?:, in (.+))?"#).unwrap();
    let rust_pattern = Regex::new(r"(\d+):\s+(\S+)\s+at\s+(.+?):(\d+)").unwrap();
    let go_pattern = Regex::new(r"\t(.+?):(\d+)\s").unwrap();

    let mut frames = Vec::new();
    let mut trace_type = "unknown".to_string();

    for line in output.lines() {
        if let Some(caps) = js_pattern.captures(line) {
            trace_type = "javascript".to_string();
            frames.push(StackFrame {
                function_name: caps.get(1).map(|m| m.as_str().to_string()),
                file: caps[2].to_string(),
                line: caps[3].parse().unwrap_or(0),
                column: caps[4].parse().ok(),
                raw: line.trim().to_string(),
            });
        } else if let Some(caps) = python_pattern.captures(line) {
            trace_type = "python".to_string();
            frames.push(StackFrame {
                file: caps[1].to_string(),
                line: caps[2].parse().unwrap_or(0),
                column: None,
                function_name: caps.get(3).map(|m| m.as_str().to_string()),
                raw: line.trim().to_string(),
            });
        } else if let Some(caps) = rust_pattern.captures(line) {
            trace_type = "rust".to_string();
            frames.push(StackFrame {
                function_name: Some(caps[2].to_string()),
                file: caps[3].to_string(),
                line: caps[4].parse().unwrap_or(0),
                column: None,
                raw: line.trim().to_string(),
            });
        } else if let Some(caps) = go_pattern.captures(line) {
            trace_type = "go".to_string();
            frames.push(StackFrame {
                file: caps[1].to_string(),
                line: caps[2].parse().unwrap_or(0),
                column: None,
                function_name: None,
                raw: line.trim().to_string(),
            });
        }
    }

    if frames.is_empty() {
        return None;
    }

    let error_line = output
        .lines()
        .find(|l| {
            let re = Regex::new(r"(?i)error|exception|panic|fatal").unwrap();
            re.is_match(l)
        })
        .unwrap_or(output.lines().next().unwrap_or(""))
        .trim()
        .to_string();

    Some(ParsedStackTrace {
        message: error_line,
        trace_type,
        frames,
    })
}

fn extract_diagnostics(output: &str, project_path: &str) -> Vec<TerminalDiagnostic> {
    let mut diagnostics = Vec::new();

    // TypeScript compiler errors: file(line,col): error TSxxxx: message
    let tsc_pattern = Regex::new(r"(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)").unwrap();
    for caps in tsc_pattern.captures_iter(output) {
        diagnostics.push(TerminalDiagnostic {
            path: format!("{}/{}", project_path, &caps[1]),
            line: caps[2].parse().unwrap_or(0),
            column: caps[3].parse().unwrap_or(0),
            message: caps[6].to_string(),
            severity: if &caps[4] == "error" { "error" } else { "warning" }.to_string(),
            source: "tsc".to_string(),
            code: Some(caps[5].to_string()),
        });
    }

    // ESLint: file:line:col: severity message rule
    let eslint_pattern = Regex::new(r"(.+?):(\d+):(\d+):\s*(error|warning)\s+(.+?)\s+(\S+)$").unwrap();
    for caps in eslint_pattern.captures_iter(output) {
        diagnostics.push(TerminalDiagnostic {
            path: format!("{}/{}", project_path, &caps[1]),
            line: caps[2].parse().unwrap_or(0),
            column: caps[3].parse().unwrap_or(0),
            message: caps[5].to_string(),
            severity: if &caps[4] == "error" { "error" } else { "warning" }.to_string(),
            source: "eslint".to_string(),
            code: Some(caps[6].to_string()),
        });
    }

    // Rust compiler: error[Exxxx]: message --> file:line:col
    let rust_pattern = Regex::new(r"-->\s*(.+?):(\d+):(\d+)").unwrap();
    for caps in rust_pattern.captures_iter(output) {
        diagnostics.push(TerminalDiagnostic {
            path: format!("{}/{}", project_path, &caps[1]),
            line: caps[2].parse().unwrap_or(0),
            column: caps[3].parse().unwrap_or(0),
            message: String::new(),
            severity: "error".to_string(),
            source: "rustc".to_string(),
            code: None,
        });
    }

    diagnostics
}
