export const MAX_CONTEXT = 5;

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface StoredSession {
  id: string;       // unix ms timestamp as string — also used as n8n session_id
  name: string;     // first user message (truncated)
  agentId: string;
  messages: StoredMessage[];
}

const STORAGE_KEY = "n8n_chat_sessions";

function load(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(sessions: StoredSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getSessions(agentId: string): StoredSession[] {
  return load()
    .filter((s) => s.agentId === agentId)
    .sort((a, b) => Number(b.id) - Number(a.id)); // newest first
}

export function getSession(sessionId: string): StoredSession | undefined {
  return load().find((s) => s.id === sessionId);
}

export function createSession(agentId: string, firstMessage: string): StoredSession {
  const id = String(Date.now());
  const name = firstMessage.length > 45 ? firstMessage.slice(0, 42) + "..." : firstMessage;
  const session: StoredSession = { id, name, agentId, messages: [] };
  const all = load();
  all.push(session);
  save(all);
  return session;
}

export function appendMessage(sessionId: string, message: StoredMessage): void {
  const all = load();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;
  all[idx].messages.push(message);
  save(all);
}

export function userMessageCount(session: StoredSession): number {
  return session.messages.filter((m) => m.role === "user").length;
}

export function getAllSessions(): StoredSession[] {
  return load().sort((a, b) => Number(b.id) - Number(a.id));
}

export function deleteSession(sessionId: string): void {
  save(load().filter((s) => s.id !== sessionId));
}

export function renameSession(sessionId: string, name: string): void {
  const all = load();
  const s = all.find((s) => s.id === sessionId);
  if (s) { s.name = name.slice(0, 45); save(all); }
}

export function clearAllSessions(): void {
  save([]);
}

export function createEmptySession(agentId: string, name: string): StoredSession {
  const id = String(Date.now());
  const session: StoredSession = { id, name: name.slice(0, 45), agentId, messages: [] };
  const all = load();
  all.push(session);
  save(all);
  return session;
}
