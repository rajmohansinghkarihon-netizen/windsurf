import type { EditorTab } from '../../types';

export interface WorkspaceConfig {
  id: string;
  name: string;
  rootPaths: string[];
  openFiles: string[];
  activeFile: string;
  sidebarState: {
    visible: boolean;
    panel: string;
    width: number;
  };
  bottomPanelState: {
    visible: boolean;
    panel: string;
    height: number;
  };
  rightPanelState: {
    visible: boolean;
    panel: string;
    width: number;
  };
  editorLayout: {
    splitEnabled: boolean;
    orientation: 'horizontal' | 'vertical';
  };
  createdAt: number;
  updatedAt: number;
}

export interface RecentWorkspace {
  id: string;
  name: string;
  rootPaths: string[];
  lastOpened: number;
}

const WORKSPACE_STORAGE_KEY = 'zenith-workspaces';
const RECENT_WORKSPACES_KEY = 'zenith-recent-workspaces';

export class WorkspaceManager {
  private currentWorkspace: WorkspaceConfig | null = null;

  async saveWorkspace(workspace: WorkspaceConfig): Promise<void> {
    const workspaces = await this.listWorkspaces();
    const idx = workspaces.findIndex((w) => w.id === workspace.id);
    if (idx >= 0) {
      workspaces[idx] = { ...workspace, updatedAt: Date.now() };
    } else {
      workspaces.push({ ...workspace, updatedAt: Date.now() });
    }
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaces));
    this.currentWorkspace = workspace;

    await this.addToRecent({
      id: workspace.id,
      name: workspace.name,
      rootPaths: workspace.rootPaths,
      lastOpened: Date.now(),
    });
  }

  async loadWorkspace(id: string): Promise<WorkspaceConfig | null> {
    const workspaces = await this.listWorkspaces();
    const workspace = workspaces.find((w) => w.id === id);
    if (workspace) {
      this.currentWorkspace = workspace;
      await this.addToRecent({
        id: workspace.id,
        name: workspace.name,
        rootPaths: workspace.rootPaths,
        lastOpened: Date.now(),
      });
    }
    return workspace || null;
  }

  async listWorkspaces(): Promise<WorkspaceConfig[]> {
    try {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async deleteWorkspace(id: string): Promise<void> {
    const workspaces = await this.listWorkspaces();
    const filtered = workspaces.filter((w) => w.id !== id);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(filtered));
  }

  getCurrentWorkspace(): WorkspaceConfig | null {
    return this.currentWorkspace;
  }

  createWorkspaceFromState(
    name: string,
    rootPaths: string[],
    tabs: EditorTab[],
    activeTabId: string,
    uiState: {
      sidebarVisible: boolean;
      sidebarPanel: string;
      sidebarWidth: number;
      bottomPanelVisible: boolean;
      bottomPanel: string;
      bottomPanelHeight: number;
      rightPanelVisible: boolean;
      rightPanel: string;
      rightPanelWidth: number;
      splitEnabled: boolean;
      splitOrientation: 'horizontal' | 'vertical';
    }
  ): WorkspaceConfig {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    return {
      id: `ws-${Date.now()}`,
      name,
      rootPaths,
      openFiles: tabs.map((t) => t.path),
      activeFile: activeTab?.path || '',
      sidebarState: {
        visible: uiState.sidebarVisible,
        panel: uiState.sidebarPanel,
        width: uiState.sidebarWidth,
      },
      bottomPanelState: {
        visible: uiState.bottomPanelVisible,
        panel: uiState.bottomPanel,
        height: uiState.bottomPanelHeight,
      },
      rightPanelState: {
        visible: uiState.rightPanelVisible,
        panel: uiState.rightPanel,
        width: uiState.rightPanelWidth,
      },
      editorLayout: {
        splitEnabled: uiState.splitEnabled,
        orientation: uiState.splitOrientation,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  async getRecentWorkspaces(): Promise<RecentWorkspace[]> {
    try {
      const stored = localStorage.getItem(RECENT_WORKSPACES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async addToRecent(workspace: RecentWorkspace): Promise<void> {
    const recent = await this.getRecentWorkspaces();
    const filtered = recent.filter((w) => w.id !== workspace.id);
    const updated = [workspace, ...filtered].slice(0, 20);
    localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(updated));
  }
}

export const workspaceManager = new WorkspaceManager();
