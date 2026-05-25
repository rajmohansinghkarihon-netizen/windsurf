import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export interface AppConfig {
  provider: string;
  api_key: string;
  model: string;
  theme: string;
}

export interface LlmRequest {
  provider: string;
  api_key: string;
  model: string;
  system_prompt: string;
  user_prompt: string;
}

export interface LlmResponse {
  text: string;
  success: boolean;
  error?: string;
}

export interface CmdResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

// Project root (sandbox boundary)
export const setProjectRoot = (path: string) =>
  invoke<void>("set_project_root", { path });

// File System
export const readDirectory = (path: string) =>
  invoke<FileEntry[]>("read_directory", { path });

export const readFile = (path: string) =>
  invoke<string>("read_file", { path });

export const writeFile = (path: string, content: string) =>
  invoke<void>("write_file", { path, content });

export const createFile = (path: string) =>
  invoke<void>("create_file", { path });

export const createDirectory = (path: string) =>
  invoke<void>("create_directory", { path });

export const deletePath = (path: string) =>
  invoke<void>("delete_path", { path });

export const renamePath = (oldPath: string, newPath: string) =>
  invoke<void>("rename_path", { oldPath, newPath });

// Terminal
export const runTerminalCommand = (command: string, cwd: string) =>
  invoke<CmdResult>("run_terminal_command", { command, cwd });

// Config — uses tauri-plugin-store (app data directory, not plaintext in project)
const STORE_NAME = "punamide-settings.json";

export async function loadConfigFromStore(): Promise<AppConfig> {
  try {
    const store = await load(STORE_NAME, { autoSave: true, defaults: {} });
    const provider = ((await store.get("provider")) as string) || "gemini";
    const api_key = ((await store.get("api_key")) as string) || "";
    const model = ((await store.get("model")) as string) || "gemini-2.0-flash";
    const theme = ((await store.get("theme")) as string) || "dark";
    return { provider, api_key, model, theme };
  } catch {
    return {
      provider: "gemini",
      api_key: "",
      model: "gemini-2.0-flash",
      theme: "dark",
    };
  }
}

export async function saveConfigToStore(config: AppConfig): Promise<void> {
  const store = await load(STORE_NAME, { autoSave: true, defaults: {} });
  await store.set("provider", config.provider);
  await store.set("api_key", config.api_key);
  await store.set("model", config.model);
  await store.set("theme", config.theme);
  await store.save();
}

// Legacy config (kept for migration, will be removed)
export const loadConfig = (configPath: string) =>
  invoke<AppConfig>("load_config", { configPath });

export const saveConfig = (configPath: string, config: AppConfig) =>
  invoke<void>("save_config", { configPath, config });

// LLM
export const callLlm = (request: LlmRequest) =>
  invoke<LlmResponse>("call_llm", { request });

// Provider defaults
export const PROVIDERS: Record<string, { name: string; defaultModel: string; keyLabel: string; getKeyUrl: string }> = {
  gemini: {
    name: "Google Gemini",
    defaultModel: "gemini-2.0-flash",
    keyLabel: "Gemini API Key",
    getKeyUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    name: "Groq",
    defaultModel: "llama-3.1-70b-versatile",
    keyLabel: "Groq API Key",
    getKeyUrl: "https://console.groq.com/keys",
  },
  openai: {
    name: "OpenAI",
    defaultModel: "gpt-4o-mini",
    keyLabel: "OpenAI API Key",
    getKeyUrl: "https://platform.openai.com/api-keys",
  },
};
