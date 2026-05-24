import type { Diagnostic } from '../../types';
import { runTerminalCommand } from '../tauri';

export interface LSPServerConfig {
  languageId: string;
  serverCommand: string;
  args: string[];
  rootUri: string;
  fileExtensions: string[];
  autoStart: boolean;
}

export type LSPServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface LSPServerState {
  config: LSPServerConfig;
  status: LSPServerStatus;
  capabilities: string[];
  error?: string;
  pid?: number;
}

export interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText: string;
  sortText?: string;
}

export interface HoverInfo {
  contents: string;
  range?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface LocationResult {
  uri: string;
  line: number;
  column: number;
}

const DEFAULT_LSP_CONFIGS: LSPServerConfig[] = [
  {
    languageId: 'typescript',
    serverCommand: 'typescript-language-server',
    args: ['--stdio'],
    rootUri: '',
    fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
    autoStart: true,
  },
  {
    languageId: 'rust',
    serverCommand: 'rust-analyzer',
    args: [],
    rootUri: '',
    fileExtensions: ['.rs'],
    autoStart: false,
  },
  {
    languageId: 'python',
    serverCommand: 'pylsp',
    args: [],
    rootUri: '',
    fileExtensions: ['.py'],
    autoStart: false,
  },
  {
    languageId: 'go',
    serverCommand: 'gopls',
    args: ['serve'],
    rootUri: '',
    fileExtensions: ['.go'],
    autoStart: false,
  },
  {
    languageId: 'css',
    serverCommand: 'vscode-css-language-server',
    args: ['--stdio'],
    rootUri: '',
    fileExtensions: ['.css', '.scss', '.less'],
    autoStart: false,
  },
  {
    languageId: 'html',
    serverCommand: 'vscode-html-language-server',
    args: ['--stdio'],
    rootUri: '',
    fileExtensions: ['.html', '.htm'],
    autoStart: false,
  },
  {
    languageId: 'json',
    serverCommand: 'vscode-json-language-server',
    args: ['--stdio'],
    rootUri: '',
    fileExtensions: ['.json', '.jsonc'],
    autoStart: false,
  },
];

export class LSPManager {
  private servers: Map<string, LSPServerState> = new Map();
  private projectPath: string = '';
  private onDiagnosticsUpdate?: (diagnostics: Diagnostic[]) => void;

  setProjectPath(path: string): void {
    this.projectPath = path;
    for (const [, server] of this.servers) {
      server.config.rootUri = `file://${path}`;
    }
  }

  setDiagnosticsCallback(callback: (diagnostics: Diagnostic[]) => void): void {
    this.onDiagnosticsUpdate = callback;
  }

  getDefaultConfigs(): LSPServerConfig[] {
    return DEFAULT_LSP_CONFIGS.map((c) => ({
      ...c,
      rootUri: `file://${this.projectPath}`,
    }));
  }

  async startServer(languageId: string): Promise<void> {
    const config = DEFAULT_LSP_CONFIGS.find((c) => c.languageId === languageId);
    if (!config) throw new Error(`No LSP config for language: ${languageId}`);

    const serverConfig = { ...config, rootUri: `file://${this.projectPath}` };

    this.servers.set(languageId, {
      config: serverConfig,
      status: 'starting',
      capabilities: [],
    });

    try {
      const checkResult = await runTerminalCommand(
        `which ${serverConfig.serverCommand} 2>/dev/null || where ${serverConfig.serverCommand} 2>/dev/null`,
        this.projectPath
      );

      if (checkResult.exit_code !== 0) {
        throw new Error(
          `LSP server '${serverConfig.serverCommand}' not found. Install it first.`
        );
      }

      const state = this.servers.get(languageId);
      if (state) {
        state.status = 'running';
        state.capabilities = [
          'textDocument/completion',
          'textDocument/hover',
          'textDocument/definition',
          'textDocument/references',
          'textDocument/diagnostics',
          'textDocument/formatting',
          'textDocument/rename',
          'textDocument/codeAction',
          'textDocument/signatureHelp',
        ];
      }
    } catch (err) {
      const state = this.servers.get(languageId);
      if (state) {
        state.status = 'error';
        state.error = err instanceof Error ? err.message : String(err);
      }
    }
  }

  async stopServer(languageId: string): Promise<void> {
    const server = this.servers.get(languageId);
    if (!server) return;

    server.status = 'stopped';
    server.capabilities = [];
  }

  async autoStartServers(fileExtensions: string[]): Promise<void> {
    for (const config of DEFAULT_LSP_CONFIGS) {
      if (!config.autoStart) continue;
      const hasMatchingFile = fileExtensions.some((ext) =>
        config.fileExtensions.includes(ext)
      );
      if (hasMatchingFile) {
        await this.startServer(config.languageId);
      }
    }
  }

  getServerState(languageId: string): LSPServerState | undefined {
    return this.servers.get(languageId);
  }

  getAllServers(): LSPServerState[] {
    return Array.from(this.servers.values());
  }

  getLanguageForFile(filePath: string): string | undefined {
    const ext = '.' + (filePath.split('.').pop()?.toLowerCase() || '');
    for (const config of DEFAULT_LSP_CONFIGS) {
      if (config.fileExtensions.includes(ext)) {
        return config.languageId;
      }
    }
    return undefined;
  }

  isServerRunning(languageId: string): boolean {
    const server = this.servers.get(languageId);
    return server?.status === 'running';
  }

  getRunningLanguages(): string[] {
    const running: string[] = [];
    for (const [lang, server] of this.servers) {
      if (server.status === 'running') running.push(lang);
    }
    return running;
  }
}

export const lspManager = new LSPManager();
