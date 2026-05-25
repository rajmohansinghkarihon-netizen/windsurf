import type { LlmRequest } from '../../types';
import { useAgentStore } from '../../store/agentStore';
import { useAIStore } from '../../store/aiStore';
import { runTerminalCommand, callLlm, parseTerminalErrors, buildContextRust } from '../tauri';
import { AUTO_FIX_ERROR_PROMPT, STACK_TRACE_ANALYSIS_PROMPT, parseResponse } from '../../utils/prompts';

export interface AgentLoopConfig {
  projectPath: string;
  provider: string;
  apiKey: string;
  model: string;
  maxRetries: number;
  autoFix: boolean;
}

interface LoopResult {
  success: boolean;
  output: string;
  fixesApplied: number;
  iterations: number;
}

export class AgentLoop {
  private config: AgentLoopConfig;
  private aborted = false;

  constructor(config: AgentLoopConfig) {
    this.config = config;
  }

  abort(): void {
    this.aborted = true;
  }

  async runCommandWithAutoFix(command: string, currentFilePath?: string, currentFileContent?: string): Promise<LoopResult> {
    const store = useAgentStore.getState();
    let fixesApplied = 0;
    let iterations = 0;
    let lastOutput = '';

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (this.aborted) {
        return { success: false, output: 'Aborted', fixesApplied, iterations };
      }

      iterations++;
      store.addAgentLog(`[Agent Loop] Running: ${command} (attempt ${attempt + 1})`);

      const result = await runTerminalCommand(command, this.config.projectPath);
      lastOutput = result.stdout + (result.stderr ? `\n${result.stderr}` : '');

      if (result.exit_code === 0) {
        store.addAgentLog('[Agent Loop] Command succeeded');
        return { success: true, output: lastOutput, fixesApplied, iterations };
      }

      if (!this.config.autoFix || attempt >= this.config.maxRetries) {
        store.addAgentLog(`[Agent Loop] Command failed, no more retries`);
        break;
      }

      // Use Rust-based error parsing (offloaded from main thread)
      const errorInfo = await parseTerminalErrors(lastOutput, this.config.projectPath);
      if (!errorInfo.has_error) {
        store.addAgentLog('[Agent Loop] Non-zero exit but no parseable error');
        break;
      }

      store.addAgentLog(`[Agent Loop] Error detected: ${errorInfo.error_type} - ${errorInfo.error_message}`);

      let contextPrompt: string;
      if (errorInfo.stack_trace && errorInfo.stack_trace.frames.length > 0) {
        contextPrompt = STACK_TRACE_ANALYSIS_PROMPT
          .replace('{STACK_TRACE}', lastOutput);
      } else {
        contextPrompt = AUTO_FIX_ERROR_PROMPT
          .replace('{ERROR_OUTPUT}', lastOutput)
          .replace('{CURRENT_FILE}', currentFileContent || '[No file context]')
          .replace('{FILE_PATH}', currentFilePath || '[Unknown]');
      }

      // Use Rust-based context building (offloaded from main thread)
      let mentionContext = '';
      if (currentFilePath) {
        const ctx = await buildContextRust({
          project_path: this.config.projectPath,
          file_paths: [currentFilePath],
        });
        mentionContext = ctx.context_text;
      }

      const fixRequest: LlmRequest = {
        provider: this.config.provider,
        api_key: this.config.apiKey,
        model: this.config.model,
        system_prompt: 'You are Zenith Agent auto-fix. Analyze the error and provide a fix. Use ===FILE: and ===CMD: format for changes.',
        user_prompt: `${contextPrompt}\n\n${mentionContext}`,
      };

      store.addAgentLog('[Agent Loop] Requesting AI fix...');
      const fixResponse = await callLlm(fixRequest);

      if (!fixResponse.success) {
        store.addAgentLog(`[Agent Loop] AI fix request failed: ${fixResponse.error}`);
        break;
      }

      const parsed = parseResponse(fixResponse.text, new Set());

      if (parsed.fileChanges.length === 0 && parsed.commands.length === 0) {
        store.addAgentLog('[Agent Loop] AI returned no actionable fixes');
        break;
      }

      for (const fileChange of parsed.fileChanges) {
        store.addAgentLog(`[Agent Loop] Applying fix to: ${fileChange.path}`);
        const { writeFile } = await import('../tauri');
        const fullPath = `${this.config.projectPath}/${fileChange.path}`;
        await writeFile(fullPath, fileChange.content);
        fixesApplied++;
      }

      for (const cmd of parsed.commands) {
        store.addAgentLog(`[Agent Loop] Running fix command: ${cmd}`);
        await runTerminalCommand(cmd, this.config.projectPath);
      }

      store.addAgentLog('[Agent Loop] Fix applied, retrying original command...');
    }

    return { success: false, output: lastOutput, fixesApplied, iterations };
  }

  async watchTerminalAndFix(terminalOutput: string, currentFilePath?: string, currentFileContent?: string): Promise<LoopResult> {
    // Use Rust-based error parsing
    const errorInfo = await parseTerminalErrors(terminalOutput, this.config.projectPath);

    if (!errorInfo.has_error) {
      return { success: true, output: terminalOutput, fixesApplied: 0, iterations: 0 };
    }

    const store = useAgentStore.getState();
    store.addAgentLog(`[Agent Loop] Terminal error detected: ${errorInfo.error_type}`);

    const aiStore = useAIStore.getState();
    const fixPrompt = AUTO_FIX_ERROR_PROMPT
      .replace('{ERROR_OUTPUT}', terminalOutput)
      .replace('{CURRENT_FILE}', currentFileContent || '')
      .replace('{FILE_PATH}', currentFilePath || '');

    const request: LlmRequest = {
      provider: this.config.provider,
      api_key: this.config.apiKey,
      model: this.config.model,
      system_prompt: 'You are Zenith Agent. Analyze the terminal error and provide a fix.',
      user_prompt: fixPrompt,
    };

    const response = await callLlm(request);
    if (!response.success) {
      return { success: false, output: `AI error: ${response.error}`, fixesApplied: 0, iterations: 1 };
    }

    const parsed = parseResponse(response.text, new Set());
    let fixesApplied = 0;

    for (const fc of parsed.fileChanges) {
      const { writeFile } = await import('../tauri');
      await writeFile(`${this.config.projectPath}/${fc.path}`, fc.content);
      fixesApplied++;
    }

    aiStore.addMessage({
      id: `auto-fix-${Date.now()}`,
      role: 'assistant',
      content: response.text,
      timestamp: Date.now(),
      parsed,
    });

    return { success: fixesApplied > 0, output: response.text, fixesApplied, iterations: 1 };
  }
}
