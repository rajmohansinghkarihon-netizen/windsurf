import { create } from 'zustand';
import type { ChatMessage, MentionContext, ComposerSession, UsageRecord, UsageSummary, Notepad } from '../types';

interface AIState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  currentMentions: MentionContext[];
  mentionSuggestions: string[];
  showMentionPopup: boolean;

  composerSession: ComposerSession | null;
  composerHistory: ComposerSession[];

  notepads: Notepad[];
  activeNotepadId: string;

  usageRecords: UsageRecord[];
  usageSummary: UsageSummary;

  promptHistory: string[];
  customInstructions: string;

  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, update: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;

  setCurrentMentions: (mentions: MentionContext[]) => void;
  addMention: (mention: MentionContext) => void;
  removeMention: (index: number) => void;
  setShowMentionPopup: (show: boolean) => void;
  setMentionSuggestions: (suggestions: string[]) => void;

  setComposerSession: (session: ComposerSession | null) => void;
  addComposerHistory: (session: ComposerSession) => void;

  addNotepad: (notepad: Notepad) => void;
  updateNotepad: (id: string, update: Partial<Notepad>) => void;
  deleteNotepad: (id: string) => void;
  setActiveNotepadId: (id: string) => void;

  addUsageRecord: (record: UsageRecord) => void;
  recalcUsageSummary: () => void;

  addToPromptHistory: (prompt: string) => void;
  setCustomInstructions: (instructions: string) => void;
}

function calcUsageSummary(records: UsageRecord[]): UsageSummary {
  const summary: UsageSummary = {
    totalTokens: 0,
    totalCost: 0,
    byProvider: {},
    byDay: {},
  };

  for (const r of records) {
    summary.totalTokens += r.totalTokens;
    summary.totalCost += r.estimatedCost;

    if (!summary.byProvider[r.provider]) {
      summary.byProvider[r.provider] = { tokens: 0, cost: 0 };
    }
    summary.byProvider[r.provider].tokens += r.totalTokens;
    summary.byProvider[r.provider].cost += r.estimatedCost;

    const day = new Date(r.timestamp).toISOString().split('T')[0];
    if (!summary.byDay[day]) {
      summary.byDay[day] = { tokens: 0, cost: 0 };
    }
    summary.byDay[day].tokens += r.totalTokens;
    summary.byDay[day].cost += r.estimatedCost;
  }

  return summary;
}

export const useAIStore = create<AIState>((set) => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',
  currentMentions: [],
  mentionSuggestions: [],
  showMentionPopup: false,

  composerSession: null,
  composerHistory: [],

  notepads: [],
  activeNotepadId: '',

  usageRecords: [],
  usageSummary: { totalTokens: 0, totalCost: 0, byProvider: {}, byDay: {} },

  promptHistory: [],
  customInstructions: '',

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  updateMessage: (id, update) => set((state) => ({
    messages: state.messages.map((m) => m.id === id ? { ...m, ...update } : m),
  })),

  clearMessages: () => set({ messages: [] }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (chunk) => set((state) => ({
    streamingContent: state.streamingContent + chunk,
  })),

  setCurrentMentions: (mentions) => set({ currentMentions: mentions }),
  addMention: (mention) => set((state) => ({
    currentMentions: [...state.currentMentions, mention],
  })),
  removeMention: (index) => set((state) => ({
    currentMentions: state.currentMentions.filter((_, i) => i !== index),
  })),
  setShowMentionPopup: (show) => set({ showMentionPopup: show }),
  setMentionSuggestions: (suggestions) => set({ mentionSuggestions: suggestions }),

  setComposerSession: (session) => set({ composerSession: session }),
  addComposerHistory: (session) => set((state) => ({
    composerHistory: [session, ...state.composerHistory].slice(0, 50),
  })),

  addNotepad: (notepad) => set((state) => ({
    notepads: [...state.notepads, notepad],
  })),
  updateNotepad: (id, update) => set((state) => ({
    notepads: state.notepads.map((n) => n.id === id ? { ...n, ...update } : n),
  })),
  deleteNotepad: (id) => set((state) => ({
    notepads: state.notepads.filter((n) => n.id !== id),
  })),
  setActiveNotepadId: (id) => set({ activeNotepadId: id }),

  addUsageRecord: (record) => {
    set((state) => {
      const records = [...state.usageRecords, record];
      return { usageRecords: records, usageSummary: calcUsageSummary(records) };
    });
  },
  recalcUsageSummary: () => {
    set((state) => ({ usageSummary: calcUsageSummary(state.usageRecords) }));
  },

  addToPromptHistory: (prompt) => set((state) => ({
    promptHistory: [prompt, ...state.promptHistory.filter((p) => p !== prompt)].slice(0, 100),
  })),
  setCustomInstructions: (instructions) => set({ customInstructions: instructions }),
}));
