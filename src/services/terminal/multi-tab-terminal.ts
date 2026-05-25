import { useTerminalStore } from '../../store/terminalStore';

export interface TerminalTab {
  id: string;
  name: string;
  agentTaskId?: string;
  output: string[];
  isRunning: boolean;
  exitCode?: number;
  command?: string;
  startedAt?: number;
  completedAt?: number;
}

class MultiTabTerminal {
  private tabs: Map<string, TerminalTab> = new Map();

  createTab(name: string, agentTaskId?: string): TerminalTab {
    const tab: TerminalTab = {
      id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      agentTaskId,
      output: [],
      isRunning: false,
    };

    this.tabs.set(tab.id, tab);

    const store = useTerminalStore.getState();
    store.addSession({
      id: tab.id,
      name: tab.name,
      cwd: '',
      active: true,
    });

    return tab;
  }

  appendOutput(tabId: string, text: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.output.push(text);
      if (tab.output.length > 10000) {
        tab.output = tab.output.slice(-5000);
      }
    }
  }

  markRunning(tabId: string, command: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.isRunning = true;
      tab.command = command;
      tab.startedAt = Date.now();
      tab.exitCode = undefined;
      tab.completedAt = undefined;
    }
  }

  markCompleted(tabId: string, exitCode: number): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.isRunning = false;
      tab.exitCode = exitCode;
      tab.completedAt = Date.now();
    }
  }

  getTab(tabId: string): TerminalTab | undefined {
    return this.tabs.get(tabId);
  }

  getTabForTask(agentTaskId: string): TerminalTab | undefined {
    for (const tab of this.tabs.values()) {
      if (tab.agentTaskId === agentTaskId) return tab;
    }
    return undefined;
  }

  getOrCreateTabForTask(agentTaskId: string, taskName: string): TerminalTab {
    const existing = this.getTabForTask(agentTaskId);
    if (existing) return existing;
    return this.createTab(`Agent: ${taskName}`, agentTaskId);
  }

  removeTab(tabId: string): void {
    this.tabs.delete(tabId);
    const store = useTerminalStore.getState();
    store.removeSession(tabId);
  }

  getAllTabs(): TerminalTab[] {
    return Array.from(this.tabs.values());
  }

  getOutput(tabId: string): string {
    const tab = this.tabs.get(tabId);
    return tab ? tab.output.join('\n') : '';
  }

  clearOutput(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.output = [];
    }
  }
}

export const multiTabTerminal = new MultiTabTerminal();
