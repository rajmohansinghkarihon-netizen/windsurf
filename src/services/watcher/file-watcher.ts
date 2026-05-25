import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { readFile, startFileWatcher, stopFileWatcher } from '../tauri';
import { useEditorStore } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { readDirectory } from '../tauri';

interface FileChangeEvent {
  path: string;
  kind: string;
}

export class FileWatcher {
  private projectPath: string;
  private unlisten: UnlistenFn | null = null;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private running = false;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.unlisten = await listen<FileChangeEvent>('file-changed', (event) => {
      this.handleChange(event.payload);
    });

    await startFileWatcher(this.projectPath);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    await stopFileWatcher();
  }

  private handleChange(event: FileChangeEvent): void {
    const existing = this.debounceTimers.get(event.path);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      event.path,
      setTimeout(() => {
        this.debounceTimers.delete(event.path);
        this.processChange(event);
      }, 300)
    );
  }

  private async processChange(event: FileChangeEvent): Promise<void> {
    const editorStore = useEditorStore.getState();
    const fileStore = useFileStore.getState();

    if (event.kind === 'deleted') {
      const tab = editorStore.tabs.find((t) => t.path === event.path);
      if (tab) {
        editorStore.closeTab(tab.id);
      }
    }

    if (event.kind === 'modified') {
      const tab = editorStore.tabs.find((t) => t.path === event.path);
      if (tab && !tab.modified) {
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

    // Refresh file tree on create/delete
    if (event.kind === 'created' || event.kind === 'deleted') {
      try {
        const files = await readDirectory(this.projectPath);
        fileStore.setFiles(files);
      } catch {
        // Retry later
      }
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}
