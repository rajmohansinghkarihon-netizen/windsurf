// ============================================================
// Zenith IDE - Core Type Definitions
// ============================================================

// --- File System ---

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
  size?: number;
  modified?: number;
}

export interface FileChange {
  path: string;
  content: string;
  isNew: boolean;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  path: string;
  oldContent: string;
  newContent: string;
  hunks: DiffHunk[];
  isNew: boolean;
  isDeleted: boolean;
}

// --- Editor ---

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  modified: boolean;
  language: string;
  viewState?: unknown;
  splitSide?: 'left' | 'right';
}

export interface EditorSplitState {
  enabled: boolean;
  orientation: 'horizontal' | 'vertical';
  sizes: number[];
}

export interface InlineEditRequest {
  filePath: string;
  startLine: number;
  endLine: number;
  instruction: string;
  selectedText: string;
}

export interface GhostTextSuggestion {
  text: string;
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

// --- Terminal ---

export interface CmdResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  active: boolean;
}

// --- AI / LLM ---

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'groq';

export interface ProviderConfig {
  name: string;
  defaultModel: string;
  models: string[];
  keyLabel: string;
  getKeyUrl: string;
  baseUrl: string;
  supportsStreaming: boolean;
  supportsVision: boolean;
}

export interface LlmRequest {
  provider: string;
  api_key: string;
  model: string;
  system_prompt: string;
  user_prompt: string;
  images?: string[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LlmResponse {
  text: string;
  success: boolean;
  error?: string;
  usage?: TokenUsage;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  parsed?: ParsedResponse;
  applied?: boolean;
  images?: string[];
  mentions?: MentionContext[];
  usage?: TokenUsage;
  streaming?: boolean;
}

export interface MentionContext {
  type: '@file' | '@folder' | '@codebase' | '@web' | '@docs' | '@git' | '@terminal' | '@selection' | '@problems';
  value: string;
  resolvedContent?: string;
}

export interface ParsedResponse {
  explanation: string;
  fileChanges: FileChange[];
  deletions: string[];
  commands: string[];
}

// --- Agent ---

export type AgentTaskStatus = 'pending' | 'queued' | 'planning' | 'executing' | 'verifying' | 'awaiting_approval' | 'completed' | 'failed' | 'paused';

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: AgentTaskStatus;
  steps: AgentStep[];
  currentStep: number;
  createdAt: number;
  updatedAt: number;
  checkpointId?: string;
  error?: string;
  result?: string;
  totalFiles?: number;
  totalCommands?: number;
}

export interface AgentStep {
  id: string;
  type: 'plan' | 'read_file' | 'write_file' | 'create_file' | 'delete_file' | 'search' | 'terminal' | 'git' | 'lsp' | 'test' | 'verify';
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: Record<string, unknown>;
  output?: string;
  requiresApproval: boolean;
  approved?: boolean;
  error?: string;
  timestamp?: number;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  stepId: string;
  type: 'file_write' | 'file_delete' | 'terminal_command' | 'package_install' | 'git_operation';
  description: string;
  details: string;
  diff?: FileDiff;
  command?: string;
  timestamp: number;
}

export interface Checkpoint {
  id: string;
  taskId: string;
  timestamp: number;
  description: string;
  files: { path: string; content: string }[];
  gitRef?: string;
}

// --- Git ---

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  refs?: string[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  ahead?: number;
  behind?: number;
}

// --- Search ---

export interface SearchResult {
  path: string;
  line: number;
  column: number;
  text: string;
  matchLength: number;
  contextBefore?: string;
  contextAfter?: string;
}

export interface SearchOptions {
  query: string;
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  includePattern?: string;
  excludePattern?: string;
  maxResults?: number;
}

// --- Settings ---

export interface AppConfig {
  provider: AIProvider;
  api_key: string;
  model: string;
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  ghostText: boolean;
  providerKeys: Record<string, string>;
  recentProjects: string[];
  customKeybindings: Record<string, string>;
  projectRules: string;
  ollamaUrl: string;
  openrouterKey: string;
}

// --- Problems / Diagnostics ---

export interface Diagnostic {
  path: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  source?: string;
  code?: string;
}

// --- Notepad ---

export interface Notepad {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
}

// --- Composer ---

export interface ComposerSession {
  id: string;
  instruction: string;
  status: 'drafting' | 'generating' | 'reviewing' | 'applied' | 'rejected';
  files: ComposerFile[];
  createdAt: number;
}

export interface ComposerFile {
  path: string;
  originalContent: string;
  newContent: string;
  diff: FileDiff;
  accepted: boolean;
}

// --- Extension / Plugin ---

export interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  category: 'language' | 'theme' | 'tool' | 'ai' | 'other';
  icon?: string;
}

// --- Usage Tracking ---

export interface UsageRecord {
  id: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: number;
  type: 'chat' | 'ghost_text' | 'inline_edit' | 'composer' | 'agent';
}

export interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { tokens: number; cost: number }>;
  byDay: Record<string, { tokens: number; cost: number }>;
}

// --- Keybinding ---

export interface Keybinding {
  id: string;
  label: string;
  keys: string;
  command: string;
  category: string;
  when?: string;
}

// --- Command Palette ---

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  keybinding?: string;
  category: string;
  action: () => void;
  icon?: string;
}
