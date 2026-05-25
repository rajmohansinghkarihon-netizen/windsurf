import { create } from 'zustand';
import type { AgentTask, AgentStep, ApprovalRequest, Checkpoint } from '../types';

interface AgentState {
  tasks: AgentTask[];
  activeTaskId: string;
  approvalQueue: ApprovalRequest[];
  resolvedApprovals: Map<string, boolean>;
  checkpoints: Checkpoint[];
  isAgentRunning: boolean;
  agentLogs: string[];

  addTask: (task: AgentTask) => void;
  updateTask: (id: string, update: Partial<AgentTask>) => void;
  removeTask: (id: string) => void;
  setActiveTask: (id: string) => void;

  updateStep: (taskId: string, stepId: string, update: Partial<AgentStep>) => void;
  addStep: (taskId: string, step: AgentStep) => void;

  addApprovalRequest: (request: ApprovalRequest) => void;
  resolveApproval: (id: string, approved: boolean) => void;
  clearApprovals: () => void;

  addCheckpoint: (checkpoint: Checkpoint) => void;
  removeCheckpoint: (id: string) => void;
  getCheckpointsForTask: (taskId: string) => Checkpoint[];

  setAgentRunning: (running: boolean) => void;
  addAgentLog: (log: string) => void;
  clearAgentLogs: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  tasks: [],
  activeTaskId: '',
  approvalQueue: [],
  resolvedApprovals: new Map(),
  checkpoints: [],
  isAgentRunning: false,
  agentLogs: [],

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task],
    activeTaskId: task.id,
  })),

  updateTask: (id, update) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...update, updatedAt: Date.now() } : t),
  })),

  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
    activeTaskId: state.activeTaskId === id ? '' : state.activeTaskId,
  })),

  setActiveTask: (id) => set({ activeTaskId: id }),

  updateStep: (taskId, stepId, update) => set((state) => ({
    tasks: state.tasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        steps: t.steps.map((s) => s.id === stepId ? { ...s, ...update } : s),
        updatedAt: Date.now(),
      };
    }),
  })),

  addStep: (taskId, step) => set((state) => ({
    tasks: state.tasks.map((t) => {
      if (t.id !== taskId) return t;
      return { ...t, steps: [...t.steps, step], updatedAt: Date.now() };
    }),
  })),

  addApprovalRequest: (request) => set((state) => ({
    approvalQueue: [...state.approvalQueue, request],
  })),

  resolveApproval: (id, approved) => {
    const request = get().approvalQueue.find((a) => a.id === id);
    if (!approved && request) {
      get().addAgentLog(`Approval REJECTED for: ${request.description}`);
    }
    const resolved = new Map(get().resolvedApprovals);
    resolved.set(id, approved);
    set((state) => ({
      approvalQueue: state.approvalQueue.filter((a) => a.id !== id),
      resolvedApprovals: resolved,
    }));
  },

  clearApprovals: () => set({ approvalQueue: [] }),

  addCheckpoint: (checkpoint) => set((state) => ({
    checkpoints: [...state.checkpoints, checkpoint],
  })),

  removeCheckpoint: (id) => set((state) => ({
    checkpoints: state.checkpoints.filter((c) => c.id !== id),
  })),

  getCheckpointsForTask: (taskId) => {
    return get().checkpoints.filter((c) => c.taskId === taskId);
  },

  setAgentRunning: (running) => set({ isAgentRunning: running }),

  addAgentLog: (log) => set((state) => ({
    agentLogs: [...state.agentLogs, `[${new Date().toISOString()}] ${log}`],
  })),

  clearAgentLogs: () => set({ agentLogs: [] }),
}));
