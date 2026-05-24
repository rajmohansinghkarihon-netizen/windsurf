import { create } from 'zustand';

export type SidebarPanel = 'explorer' | 'search' | 'git' | 'extensions' | 'agent';
export type BottomPanel = 'terminal' | 'problems' | 'output';
export type RightPanel = 'chat' | 'composer' | 'notepads' | 'usage';

interface UIState {
  showSidebar: boolean;
  sidebarPanel: SidebarPanel;
  sidebarWidth: number;

  showBottomPanel: boolean;
  bottomPanel: BottomPanel;
  bottomPanelHeight: number;

  showRightPanel: boolean;
  rightPanel: RightPanel;
  rightPanelWidth: number;

  showCommandPalette: boolean;
  showQuickOpen: boolean;

  showInlineEdit: boolean;
  showComposer: boolean;
  showSettings: boolean;
  showKeybindings: boolean;
  showWelcome: boolean;

  notifications: Notification[];

  toggleSidebar: () => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  setSidebarWidth: (width: number) => void;

  toggleBottomPanel: () => void;
  setBottomPanel: (panel: BottomPanel) => void;
  setBottomPanelHeight: (height: number) => void;

  toggleRightPanel: () => void;
  setRightPanel: (panel: RightPanel) => void;
  setRightPanelWidth: (width: number) => void;

  setShowCommandPalette: (show: boolean) => void;
  setShowQuickOpen: (show: boolean) => void;
  setShowInlineEdit: (show: boolean) => void;
  setShowComposer: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowKeybindings: (show: boolean) => void;
  setShowWelcome: (show: boolean) => void;

  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIState>((set) => ({
  showSidebar: true,
  sidebarPanel: 'explorer',
  sidebarWidth: 260,

  showBottomPanel: false,
  bottomPanel: 'terminal',
  bottomPanelHeight: 250,

  showRightPanel: true,
  rightPanel: 'chat',
  rightPanelWidth: 380,

  showCommandPalette: false,
  showQuickOpen: false,
  showInlineEdit: false,
  showComposer: false,
  showSettings: false,
  showKeybindings: false,
  showWelcome: true,

  notifications: [],

  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  setSidebarPanel: (panel) => set({ sidebarPanel: panel, showSidebar: true }),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(180, Math.min(500, width)) }),

  toggleBottomPanel: () => set((s) => ({ showBottomPanel: !s.showBottomPanel })),
  setBottomPanel: (panel) => set({ bottomPanel: panel, showBottomPanel: true }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(100, Math.min(600, height)) }),

  toggleRightPanel: () => set((s) => ({ showRightPanel: !s.showRightPanel })),
  setRightPanel: (panel) => set({ rightPanel: panel, showRightPanel: true }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: Math.max(280, Math.min(600, width)) }),

  setShowCommandPalette: (show) => set({ showCommandPalette: show }),
  setShowQuickOpen: (show) => set({ showQuickOpen: show }),
  setShowInlineEdit: (show) => set({ showInlineEdit: show }),
  setShowComposer: (show) => set({ showComposer: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowKeybindings: (show) => set({ showKeybindings: show }),
  setShowWelcome: (show) => set({ showWelcome: show }),

  addNotification: (notification) => set((s) => ({
    notifications: [...s.notifications, notification],
  })),
  removeNotification: (id) => set((s) => ({
    notifications: s.notifications.filter((n) => n.id !== id),
  })),
}));
