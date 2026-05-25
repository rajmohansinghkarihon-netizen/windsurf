use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct DiffResult {
    pub diff_text: String,
    pub additions: usize,
    pub deletions: usize,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Serialize, Clone, Debug)]
pub struct DiffHunk {
    pub old_start: usize,
    pub old_count: usize,
    pub new_start: usize,
    pub new_count: usize,
    pub lines: Vec<DiffLine>,
}

#[derive(Serialize, Clone, Debug)]
pub struct DiffLine {
    pub kind: String,
    pub content: String,
    pub old_line: Option<usize>,
    pub new_line: Option<usize>,
}

#[tauri::command]
pub fn generate_diff(old_content: String, new_content: String) -> Result<DiffResult, String> {
    let old_lines: Vec<&str> = old_content.split('\n').collect();
    let new_lines: Vec<&str> = new_content.split('\n').collect();

    let n = old_lines.len();
    let m = new_lines.len();

    // LCS dynamic programming
    let mut dp = vec![vec![0u32; m + 1]; n + 1];
    for i in 1..=n {
        for j in 1..=m {
            if old_lines[i - 1] == new_lines[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]);
            }
        }
    }

    // Backtrack to produce diff
    let mut raw_diff: Vec<(char, &str, Option<usize>, Option<usize>)> = Vec::new();
    let mut i = n;
    let mut j = m;

    while i > 0 || j > 0 {
        if i > 0 && j > 0 && old_lines[i - 1] == new_lines[j - 1] {
            raw_diff.push((' ', old_lines[i - 1], Some(i), Some(j)));
            i -= 1;
            j -= 1;
        } else if j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j]) {
            raw_diff.push(('+', new_lines[j - 1], None, Some(j)));
            j -= 1;
        } else {
            raw_diff.push(('-', old_lines[i - 1], Some(i), None));
            i -= 1;
        }
    }

    raw_diff.reverse();

    // Build hunks with context
    let context_lines = 3usize;
    let mut hunks: Vec<DiffHunk> = Vec::new();
    let mut additions = 0usize;
    let mut deletions = 0usize;
    let mut diff_text = String::new();

    let mut change_indices: Vec<usize> = Vec::new();
    for (idx, (kind, _, _, _)) in raw_diff.iter().enumerate() {
        if *kind != ' ' {
            change_indices.push(idx);
        }
    }

    if change_indices.is_empty() {
        return Ok(DiffResult {
            diff_text: String::new(),
            additions: 0,
            deletions: 0,
            hunks: Vec::new(),
        });
    }

    // Group changes into hunks
    let mut hunk_ranges: Vec<(usize, usize)> = Vec::new();
    let mut start = change_indices[0].saturating_sub(context_lines);
    let mut end = (change_indices[0] + context_lines).min(raw_diff.len() - 1);

    for &idx in &change_indices[1..] {
        let new_start = idx.saturating_sub(context_lines);
        let new_end = (idx + context_lines).min(raw_diff.len() - 1);

        if new_start <= end + 1 {
            end = new_end;
        } else {
            hunk_ranges.push((start, end));
            start = new_start;
            end = new_end;
        }
    }
    hunk_ranges.push((start, end));

    for (hunk_start, hunk_end) in &hunk_ranges {
        let mut hunk_lines: Vec<DiffLine> = Vec::new();
        let mut old_start = 0usize;
        let mut old_count = 0usize;
        let mut new_start = 0usize;
        let mut new_count = 0usize;
        let mut first = true;

        for idx in *hunk_start..=*hunk_end {
            if idx >= raw_diff.len() {
                break;
            }
            let (kind, content, old_ln, new_ln) = &raw_diff[idx];

            if first {
                old_start = old_ln.unwrap_or(1);
                new_start = new_ln.unwrap_or(1);
                first = false;
            }

            let kind_str = match kind {
                '+' => {
                    additions += 1;
                    new_count += 1;
                    "added"
                }
                '-' => {
                    deletions += 1;
                    old_count += 1;
                    "removed"
                }
                _ => {
                    old_count += 1;
                    new_count += 1;
                    "context"
                }
            };

            let prefix = match kind {
                '+' => "+",
                '-' => "-",
                _ => " ",
            };
            diff_text.push_str(&format!("{} {}\n", prefix, content));

            hunk_lines.push(DiffLine {
                kind: kind_str.to_string(),
                content: content.to_string(),
                old_line: *old_ln,
                new_line: *new_ln,
            });
        }

        let header = format!("@@ -{},{} +{},{} @@\n", old_start, old_count, new_start, new_count);
        diff_text.insert_str(0, &header);

        hunks.push(DiffHunk {
            old_start,
            old_count,
            new_start,
            new_count,
            lines: hunk_lines,
        });
    }

    Ok(DiffResult {
        diff_text,
        additions,
        deletions,
        hunks,
    })
}

#[tauri::command]
pub fn generate_multi_file_diff(
    changes: Vec<(String, String, String)>,
) -> Result<Vec<(String, DiffResult)>, String> {
    let mut results = Vec::new();
    for (path, old_content, new_content) in changes {
        let diff = generate_diff(old_content, new_content)?;
        results.push((path, diff));
    }
    Ok(results)
}
