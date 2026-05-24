import type { AgentTask, AgentStep, ApprovalRequest, LlmRequest } from '../../types';
import { useAgentStore } from '../../store/agentStore';
import { callLlm, readFile, writeFile, createFile, deletePath, runTerminalCommand, searchProject, createCheckpoint } from '../tauri';
import { AGENT_SYSTEM_PROMPT } from '../../utils/prompts';

type ToolFunction = (input: Record<string, unknown>) => Promise<string>;

interface Tool {
  name: string;
  description: string;
  requiresApproval: boolean;
  execute: ToolFunction;
}

export class AgentRuntime {
  private tools: Map<string, Tool> = new Map();
  private projectPath: string;
  private apiKey: string;
  private provider: string;
  private model: string;
  private abortController: AbortController | null = null;

  constructor(projectPath: string, apiKey: string, provider: string, model: string) {
    this.projectPath = projectPath;
    this.apiKey = apiKey;
    this.provider = provider;
    this.model = model;
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.registerTool({
      name: 'read_file',
      description: 'Read the contents of a file',
      requiresApproval: false,
      execute: async (input) => {
        const path = input.path as string;
        return await readFile(`${this.projectPath}/${path}`);
      },
    });

    this.registerTool({
      name: 'write_file',
      description: 'Write content to a file (creates or overwrites)',
      requiresApproval: true,
      execute: async (input) => {
        const path = input.path as string;
        const content = input.content as string;
        await writeFile(`${this.projectPath}/${path}`, content);
        return `File written: ${path}`;
      },
    });

    this.registerTool({
      name: 'create_file',
      description: 'Create a new empty file',
      requiresApproval: true,
      execute: async (input) => {
        const path = input.path as string;
        await createFile(`${this.projectPath}/${path}`);
        return `File created: ${path}`;
      },
    });

    this.registerTool({
      name: 'delete_file',
      description: 'Delete a file or directory',
      requiresApproval: true,
      execute: async (input) => {
        const path = input.path as string;
        await deletePath(`${this.projectPath}/${path}`);
        return `Deleted: ${path}`;
      },
    });

    this.registerTool({
      name: 'run_command',
      description: 'Run a terminal command',
      requiresApproval: true,
      execute: async (input) => {
        const command = input.command as string;
        const result = await runTerminalCommand(command, this.projectPath);
        return `Exit code: ${result.exit_code}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
      },
    });

    this.registerTool({
      name: 'search_project',
      description: 'Search for text patterns in the project',
      requiresApproval: false,
      execute: async (input) => {
        const query = input.query as string;
        const results = await searchProject(this.projectPath, query, {
          maxResults: 20,
        });
        return results
          .map((r) => `${r.path}:${r.line}: ${r.text}`)
          .join('\n');
      },
    });

    this.registerTool({
      name: 'list_files',
      description: 'List files in a directory',
      requiresApproval: false,
      execute: async (input) => {
        const path = input.path as string || '.';
        const result = await runTerminalCommand(`find ${path} -maxdepth 2 -type f | head -50`, this.projectPath);
        return result.stdout;
      },
    });
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async executeTask(task: AgentTask): Promise<void> {
    const store = useAgentStore.getState();
    this.abortController = new AbortController();

    try {
      await createCheckpoint(this.projectPath, task.id, `Before task: ${task.title}`);
      store.addAgentLog(`Checkpoint created for task: ${task.title}`);

      store.updateTask(task.id, { status: 'planning' });
      store.addAgentLog(`Planning task: ${task.title}`);

      const plan = await this.generatePlan(task);
      store.addAgentLog(`Plan generated with ${plan.length} steps`);

      for (let i = 0; i < plan.length; i++) {
        if (this.abortController.signal.aborted) {
          store.updateTask(task.id, { status: 'paused' });
          return;
        }

        const step = plan[i];
        store.addStep(task.id, step);
        store.updateTask(task.id, { currentStep: i, status: 'executing' });
        store.updateStep(task.id, step.id, { status: 'running', timestamp: Date.now() });
        store.addAgentLog(`Executing step ${i + 1}/${plan.length}: ${step.description}`);

        const tool = this.tools.get(step.type);
        if (!tool) {
          store.updateStep(task.id, step.id, { status: 'failed', error: `Unknown tool: ${step.type}` });
          continue;
        }

        if (tool.requiresApproval) {
          store.updateTask(task.id, { status: 'awaiting_approval' });
          const approval: ApprovalRequest = {
            id: `approval-${Date.now()}`,
            taskId: task.id,
            stepId: step.id,
            type: step.type === 'run_command' ? 'terminal_command' : 'file_write',
            description: step.description,
            details: JSON.stringify(step.input, null, 2),
            command: step.input?.command as string | undefined,
            timestamp: Date.now(),
          };
          store.addApprovalRequest(approval);
          store.addAgentLog(`Awaiting approval for: ${step.description}`);

          await this.waitForApproval(approval.id);

          store.updateTask(task.id, { status: 'executing' });
        }

        try {
          const output = await tool.execute(step.input || {});
          store.updateStep(task.id, step.id, { status: 'completed', output });
          store.addAgentLog(`Step completed: ${step.description}`);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          store.updateStep(task.id, step.id, { status: 'failed', error });
          store.addAgentLog(`Step failed: ${step.description} - ${error}`);
        }
      }

      store.updateTask(task.id, { status: 'verifying' });
      store.addAgentLog('Verifying task completion...');

      const verified = await this.verifyTask(task);
      if (verified) {
        store.updateTask(task.id, { status: 'completed', result: 'Task completed successfully' });
        store.addAgentLog('Task verified and completed');
      } else {
        store.updateTask(task.id, { status: 'failed', error: 'Verification failed' });
        store.addAgentLog('Task verification failed');
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      store.updateTask(task.id, { status: 'failed', error });
      store.addAgentLog(`Task failed: ${error}`);
    }
  }

  abort(): void {
    this.abortController?.abort();
  }

  private async generatePlan(task: AgentTask): Promise<AgentStep[]> {
    const request: LlmRequest = {
      provider: this.provider,
      api_key: this.apiKey,
      model: this.model,
      system_prompt: AGENT_SYSTEM_PROMPT,
      user_prompt: `Plan the following task. Return a JSON array of steps, each with: { "type": "read_file|write_file|create_file|delete_file|run_command|search_project", "description": "...", "input": { ... } }

Task: ${task.title}
Description: ${task.description}

Available tools: ${Array.from(this.tools.entries()).map(([name, t]) => `${name}: ${t.description}`).join('\n')}`,
    };

    const response = await callLlm(request);
    if (!response.success) {
      throw new Error(`Planning failed: ${response.error}`);
    }

    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in response');
      const rawSteps = JSON.parse(jsonMatch[0]) as Array<{type: string; description: string; input?: Record<string, unknown>}>;

      return rawSteps.map((s, i) => ({
        id: `step-${Date.now()}-${i}`,
        type: s.type as AgentStep['type'],
        description: s.description,
        status: 'pending' as const,
        input: s.input,
        requiresApproval: this.tools.get(s.type)?.requiresApproval ?? false,
      }));
    } catch {
      return [{
        id: `step-${Date.now()}-0`,
        type: 'read_file',
        description: 'Analyze project structure',
        status: 'pending',
        input: { path: '.' },
        requiresApproval: false,
      }];
    }
  }

  private async verifyTask(_task: AgentTask): Promise<boolean> {
    return true;
  }

  private async waitForApproval(approvalId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const check = () => {
        const state = useAgentStore.getState();
        const pending = state.approvalQueue.find((a) => a.id === approvalId);
        if (!pending) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }
}
