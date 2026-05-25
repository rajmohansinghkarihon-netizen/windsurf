import { readDirectory, readFile } from '../tauri';
import { useEditorStore } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import type { FileEntry } from '../../types';

interface FileSnapshot {
  path: string;
  size?: number;
  modified?: number;
}

export class FileWatcher {
  private interval: ReturnType<typeof setInterval> | null = null;
  private projectPath: string;
  private pollIntervalMs: number;
  private fileSnapshots: Map<string, FileSnapshot> = new Map();

  constructor(projectPath: string, pollIntervalMs = 2000) {
    this.projectPath = projectPath;
    this.pollIntervalMs = pollIntervalMs;
  }

  start(): void {
    if (this.interval) return;

    this.takeSnapshot();

    this.interval = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async takeSnapshot(): Promise<void> {
    try {
      const files = await readDirectory(this.projectPath);
      this.fileSnapshots.clear();
      this.collectFiles(files);
    } catch {
      // Directory might not exist yet
    }
  }

  private collectFiles(entries: FileEntry[]): void {
    for (const entry of entries) {
      if (!entry.is_dir) {
        this.fileSnapshots.set(entry.path, {
          path: entry.path,
          size: entry.size,
          modified: entry.modified,
        });
      }
      if (entry.children) {
        this.collectFiles(entry.children);
      }
    }
  }

  private async poll(): Promise<void> {
    const editorStore = useEditorStore.getState();
    const fileStore = useFileStore.getState();
    const openTabs = editorStore.tabs;

    if (openTabs.length === 0) return;

    try {
      const currentFiles = await readDirectory(this.projectPath);
      const currentPaths = new Set<string>();
      this.collectPaths(currentFiles, currentPaths);

      for (const tab of openTabs) {
        if (!currentPaths.has(tab.path)) {
          editorStore.closeTab(tab.id);
          continue;
        }

        if (!tab.modified) {
          try {
            const content = await readFile(tab.path);
            if (content !== tab.content) {
              editorStore.updateTabContent(tab.id, content);
              editorStore.markTabSaved(tab.id);
            }
          } catch {
            // File might be temporarily locked
          }
        }
      }

      const newSnapshots = new Map<string, FileSnapshot>();
      this.collectFilesInto(currentFiles, newSnapshots);

      this.fileSnapshots = newSnapshots;

      fileStore.setFiles(currentFiles);
    } catch {
      // Polling error, will retry on next interval
    }
  }

  private collectPaths(entries: FileEntry[], paths: Set<string>): void {
    for (const entry of entries) {
      paths.add(entry.path);
      if (entry.children) {
        this.collectPaths(entry.children, paths);
      }
    }
  }

  private collectFilesInto(entries: FileEntry[], map: Map<string, FileSnapshot>): void {
    for (const entry of entries) {
      if (!entry.is_dir) {
        map.set(entry.path, {
          path: entry.path,
          size: entry.size,
          modified: entry.modified,
        });
      }
      if (entry.children) {
        this.collectFilesInto(entry.children, map);
      }
    }
  }

  isRunning(): boolean {
    return this.interval !== null;
  }
}
