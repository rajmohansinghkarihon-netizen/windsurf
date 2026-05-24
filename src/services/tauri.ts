import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import type { FileEntry, AppConfig, LlmRequest, LlmResponse, CmdResult, SearchResult, GitStatus, GitCommit, GitBranch, Checkpoint } from '../types';

// --- Project Root ---

export const setProjectRoot = (path: string) =>
  invoke<void>('set_project_root', { path });

// --- File System ---

export const readDirectory = (path: string) =>
  invoke<FileEntry[]>('read_directory', { path });

export const readFile = (path: string) =>
  invoke<string>('read_file', { path });

export const writeFile = (path: string, content: string) =>
  invoke<void>('write_file', { path, content });

export const createFile = (path: string) =>
  invoke<void>('create_file', { path });

export const createDirectory = (path: string) =>
  invoke<void>('create_directory', { path });

export const deletePath = (path: string) =>
  invoke<void>('delete_path', { path });

export const renamePath = (oldPath: string, newPath: string) =>
  invoke<void>('rename_path', { oldPath, newPath });

// --- Terminal ---

export const runTerminalCommand = (command: string, cwd: string) =>
  invoke<CmdResult>('run_terminal_command', { command, cwd });

// --- Git ---

export const gitStatus = (cwd: string) =>
  invoke<GitStatus>('git_status', { cwd });

export const gitCommit = (cwd: string, message: string, files: string[]) =>
  invoke<string>('git_commit', { cwd, message, files });

export const gitDiff = (cwd: string, staged: boolean) =>
  invoke<string>('git_diff', { cwd, staged });

export const gitLog = (cwd: string, count: number) =>
  invoke<GitCommit[]>('git_log', { cwd, count });

export const gitBranches = (cwd: string) =>
  invoke<GitBranch[]>('git_branches', { cwd });

export const gitCheckout = (cwd: string, branch: string) =>
  invoke<void>('git_checkout', { cwd, branch });

export const gitCreateBranch = (cwd: string, name: string) =>
  invoke<void>('git_create_branch', { cwd, name });

export const gitStage = (cwd: string, files: string[]) =>
  invoke<void>('git_stage', { cwd, files });

export const gitUnstage = (cwd: string, files: string[]) =>
  invoke<void>('git_unstage', { cwd, files });

export const gitPush = (cwd: string) =>
  invoke<string>('git_push', { cwd });

export const gitPull = (cwd: string) =>
  invoke<string>('git_pull', { cwd });

// --- Search ---

export const searchProject = (cwd: string, query: string, options: {
  regex?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  includePattern?: string;
  excludePattern?: string;
  maxResults?: number;
}) =>
  invoke<SearchResult[]>('search_project', { cwd, query, ...options });

// --- Checkpoint ---

export const createCheckpoint = (cwd: string, taskId: string, description: string) =>
  invoke<Checkpoint>('create_checkpoint', { cwd, taskId, description });

export const restoreCheckpoint = (cwd: string, checkpointId: string) =>
  invoke<void>('restore_checkpoint', { cwd, checkpointId });

export const listCheckpoints = (cwd: string) =>
  invoke<Checkpoint[]>('list_checkpoints', { cwd });

// --- LLM ---

export const callLlm = (request: LlmRequest) =>
  invoke<LlmResponse>('call_llm', { request });

// --- Config Store ---

const STORE_NAME = 'zenith-settings.json';

export async function loadConfigFromStore(): Promise<AppConfig> {
  try {
    const store = await load(STORE_NAME, { autoSave: true, defaults: {} });
    const config: Record<string, unknown> = {};
    const keys = ['provider', 'api_key', 'model', 'theme', 'fontSize', 'fontFamily',
      'tabSize', 'wordWrap', 'minimap', 'lineNumbers', 'autoSave', 'autoSaveDelay',
      'ghostText', 'providerKeys', 'recentProjects', 'customKeybindings',
      'projectRules', 'ollamaUrl', 'openrouterKey'];

    for (const key of keys) {
      const val = await store.get(key);
      if (val !== null && val !== undefined) {
        config[key] = val;
      }
    }

    return {
      provider: (config.provider as AppConfig['provider']) || 'gemini',
      api_key: (config.api_key as string) || '',
      model: (config.model as string) || 'gemini-2.0-flash',
      theme: (config.theme as AppConfig['theme']) || 'dark',
      fontSize: (config.fontSize as number) || 14,
      fontFamily: (config.fontFamily as string) || "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
      tabSize: (config.tabSize as number) || 2,
      wordWrap: (config.wordWrap as boolean) ?? true,
      minimap: (config.minimap as boolean) ?? true,
      lineNumbers: (config.lineNumbers as boolean) ?? true,
      autoSave: (config.autoSave as boolean) ?? false,
      autoSaveDelay: (config.autoSaveDelay as number) || 1000,
      ghostText: (config.ghostText as boolean) ?? true,
      providerKeys: (config.providerKeys as Record<string, string>) || {},
      recentProjects: (config.recentProjects as string[]) || [],
      customKeybindings: (config.customKeybindings as Record<string, string>) || {},
      projectRules: (config.projectRules as string) || '',
      ollamaUrl: (config.ollamaUrl as string) || 'http://localhost:11434',
      openrouterKey: (config.openrouterKey as string) || '',
    };
  } catch {
    return {
      provider: 'gemini',
      api_key: '',
      model: 'gemini-2.0-flash',
      theme: 'dark',
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
      tabSize: 2,
      wordWrap: true,
      minimap: true,
      lineNumbers: true,
      autoSave: false,
      autoSaveDelay: 1000,
      ghostText: true,
      providerKeys: {},
      recentProjects: [],
      customKeybindings: {},
      projectRules: '',
      ollamaUrl: 'http://localhost:11434',
      openrouterKey: '',
    };
  }
}

export async function saveConfigToStore(config: AppConfig): Promise<void> {
  const store = await load(STORE_NAME, { autoSave: true, defaults: {} });
  for (const [key, value] of Object.entries(config)) {
    await store.set(key, value);
  }
  await store.save();
}

// --- Legacy Config ---

export const loadConfig = (configPath: string) =>
  invoke<AppConfig>('load_config', { configPath });

export const saveConfig = (configPath: string, config: AppConfig) =>
  invoke<void>('save_config', { configPath, config });
