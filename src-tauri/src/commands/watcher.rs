use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

static WATCHER_ACTIVE: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Clone, Debug)]
pub struct FileChangeEvent {
    pub path: String,
    pub kind: String,
}

#[tauri::command]
pub async fn start_file_watcher(app: AppHandle, project_path: String) -> Result<(), String> {
    if WATCHER_ACTIVE.load(Ordering::SeqCst) {
        return Ok(());
    }

    let root = Path::new(&project_path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", project_path));
    }

    WATCHER_ACTIVE.store(true, Ordering::SeqCst);

    let app_handle = app.clone();
    let project_path_clone = project_path.clone();

    tokio::task::spawn_blocking(move || {
        let (tx, rx) = std::sync::mpsc::channel::<Result<Event, notify::Error>>();

        let skip_dirs: Vec<&str> = vec![
            ".git", "node_modules", "__pycache__", "target", "dist", "build",
            ".next", ".nuxt", "coverage", ".zenith",
        ];

        let mut watcher = match RecommendedWatcher::new(tx, Config::default()) {
            Ok(w) => w,
            Err(e) => {
                log::error!("Failed to create watcher: {}", e);
                WATCHER_ACTIVE.store(false, Ordering::SeqCst);
                return;
            }
        };

        if let Err(e) = watcher.watch(Path::new(&project_path_clone), RecursiveMode::Recursive) {
            log::error!("Failed to watch path: {}", e);
            WATCHER_ACTIVE.store(false, Ordering::SeqCst);
            return;
        }

        while WATCHER_ACTIVE.load(Ordering::SeqCst) {
            match rx.recv_timeout(std::time::Duration::from_secs(1)) {
                Ok(Ok(event)) => {
                    let kind_str = match event.kind {
                        notify::EventKind::Create(_) => "created",
                        notify::EventKind::Modify(_) => "modified",
                        notify::EventKind::Remove(_) => "deleted",
                        _ => continue,
                    };

                    for path in &event.paths {
                        let path_str = path.to_string_lossy().to_string();

                        let should_skip = skip_dirs.iter().any(|d| {
                            path_str.contains(&format!("/{}/", d))
                                || path_str.contains(&format!("\\{}\\", d))
                        });
                        if should_skip {
                            continue;
                        }

                        let _ = app_handle.emit(
                            "file-changed",
                            FileChangeEvent {
                                path: path_str,
                                kind: kind_str.to_string(),
                            },
                        );
                    }
                }
                Ok(Err(e)) => {
                    log::warn!("Watch error: {}", e);
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    continue;
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    break;
                }
            }
        }

        WATCHER_ACTIVE.store(false, Ordering::SeqCst);
    });

    Ok(())
}

#[tauri::command]
pub fn stop_file_watcher() -> Result<(), String> {
    WATCHER_ACTIVE.store(false, Ordering::SeqCst);
    Ok(())
}
