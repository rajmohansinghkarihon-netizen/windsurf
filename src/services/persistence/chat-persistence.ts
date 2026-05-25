import type { ChatMessage, UsageRecord } from '../../types';

const CHAT_SESSIONS_KEY = 'zenith-chat-sessions';
const USAGE_RECORDS_KEY = 'zenith-usage-records';
const MAX_SESSIONS = 100;
const MAX_MESSAGES_PER_SESSION = 500;

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  projectPath: string;
  provider: string;
  model: string;
}

function getStorage(): Storage {
  return window.localStorage;
}

export function saveChatSession(session: ChatSession): void {
  const storage = getStorage();
  const sessions = loadAllSessions();

  const existingIdx = sessions.findIndex((s) => s.id === session.id);
  const trimmedSession: ChatSession = {
    ...session,
    messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
    updatedAt: Date.now(),
  };

  if (existingIdx >= 0) {
    sessions[existingIdx] = trimmedSession;
  } else {
    sessions.unshift(trimmedSession);
  }

  const trimmedSessions = sessions.slice(0, MAX_SESSIONS);
  storage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(trimmedSessions));
}

export function loadAllSessions(): ChatSession[] {
  const storage = getStorage();
  const raw = storage.getItem(CHAT_SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

export function loadSession(id: string): ChatSession | null {
  const sessions = loadAllSessions();
  return sessions.find((s) => s.id === id) || null;
}

export function deleteSession(id: string): void {
  const storage = getStorage();
  const sessions = loadAllSessions().filter((s) => s.id !== id);
  storage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
}

export function createNewSession(projectPath: string, provider: string, model: string): ChatSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Chat ${new Date().toLocaleString()}`,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectPath,
    provider,
    model,
  };
}

export function renameSession(id: string, name: string): void {
  const sessions = loadAllSessions();
  const session = sessions.find((s) => s.id === id);
  if (session) {
    session.name = name;
    session.updatedAt = Date.now();
    const storage = getStorage();
    storage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
  }
}

export function saveUsageRecords(records: UsageRecord[]): void {
  const storage = getStorage();
  const trimmed = records.slice(-1000);
  storage.setItem(USAGE_RECORDS_KEY, JSON.stringify(trimmed));
}

export function loadUsageRecords(): UsageRecord[] {
  const storage = getStorage();
  const raw = storage.getItem(USAGE_RECORDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as UsageRecord[];
  } catch {
    return [];
  }
}

export function exportSessionAsMarkdown(session: ChatSession): string {
  const lines: string[] = [
    `# ${session.name}`,
    `**Date:** ${new Date(session.createdAt).toLocaleString()}`,
    `**Provider:** ${session.provider} / ${session.model}`,
    `**Project:** ${session.projectPath}`,
    '',
    '---',
    '',
  ];

  for (const msg of session.messages) {
    const role = msg.role === 'user' ? '**You**' : '**Zenith**';
    lines.push(`### ${role} (${new Date(msg.timestamp).toLocaleTimeString()})`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}
