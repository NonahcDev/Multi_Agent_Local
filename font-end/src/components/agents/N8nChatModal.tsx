"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ChevronDown } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { Agent } from "@/types/agent";
import {
  getSessions,
  createSession,
  appendMessage,
  userMessageCount,
  MAX_CONTEXT,
  type StoredSession,
  type StoredMessage,
} from "@/lib/chatStorage";

interface Props {
  agent: Agent;
  onClose: () => void;
}

type ModalState = "new-chat" | "session";

export function N8nChatModal({ agent, onClose }: Props) {
  const { isDark } = useTheme();

  const [sessions, setSessions]           = useState<StoredSession[]>([]);
  const [modalState, setModalState]       = useState<ModalState>("new-chat");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages]           = useState<StoredMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const refreshSessions = useCallback(() => {
    setSessions(getSessions(agent.id));
  }, [agent.id]);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const loadSession = useCallback((sessionId: string) => {
    const all = getSessions(agent.id);
    const session = all.find((s) => s.id === sessionId);
    if (!session) return;
    setActiveSessionId(sessionId);
    setModalState("session");
    setMessages([...session.messages]);
    setInput("");
  }, [agent.id]);

  const startNewChat = () => {
    setActiveSessionId(null);
    setModalState("new-chat");
    setMessages([]);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const usedCount     = messages.filter((m) => m.role === "user").length;
  const isLimitReached = usedCount >= MAX_CONTEXT;
  const isInputActive  = !isLimitReached;
  const canSend        = isInputActive && !isLoading && input.trim().length > 0;

  const headerTitle =
    modalState === "new-chat" ? "New Chat" :
    (activeSession?.name ?? "Chat");

  const accentColor = isDark ? "#7CC7E8" : "#2563eb";

  const handleSend = async () => {
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    setIsLoading(true);

    let sessionId = activeSessionId;

    if (!sessionId) {
      const session = createSession(agent.id, text);
      sessionId = session.id;
      setActiveSessionId(sessionId);
      setModalState("session");
      refreshSessions();
    }

    const userMsg: StoredMessage = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    appendMessage(sessionId, userMsg);

    try {
      const webhookUrl = `http://${agent.ipAddress}:5678/webhook/chat`;
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const output: string = Array.isArray(data)
        ? (data[0]?.output ?? data[0]?.text ?? JSON.stringify(data[0]))
        : (data.output ?? data.text ?? data.message ?? JSON.stringify(data));

      const assistantMsg: StoredMessage = { role: "assistant", content: output.trim(), timestamp: Date.now() };
      setMessages((prev) => [...prev, assistantMsg]);
      appendMessage(sessionId, assistantMsg);
    } catch (e) {
      const errMsg: StoredMessage = {
        role: "assistant",
        content: `⚠ Error: ${String(e)}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
      appendMessage(sessionId, errMsg);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="flex flex-col rounded-2xl border overflow-hidden"
        style={{
          width: "95vw",
          height: "95vh",
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          {/* Session dropdown */}
          <div className="relative w-52">
            <select
              value={modalState === "new-chat" ? "__new__" : (activeSessionId ?? "__new__")}
              onChange={(e) => {
                if (e.target.value === "__new__") startNewChat();
                else loadSession(e.target.value);
              }}
              className="w-full appearance-none rounded-lg border px-3 py-1.5 pr-7 text-xs font-mono truncate"
              style={{
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--border)",
                color: "var(--text-1)",
              }}
            >
              <option value="__new__">+ New Chat</option>
              {sessions.length === 0 && (
                <option value="" disabled>ไม่มี session</option>
              )}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: "var(--text-2)" }}
            />
          </div>

          {/* Centre title */}
          <div className="flex-1 text-center min-w-0">
            <p className="text-sm font-mono font-bold truncate" style={{ color: "var(--text-1)" }}>
              {agent.name}
            </p>
            <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-2)" }}>
              {headerTitle}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg border transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-2)",
              backgroundColor: "var(--surface-2)",
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <AnimatePresence initial={false}>
            {modalState === "new-chat" && messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm font-mono" style={{ color: "var(--text-2)" }}>
                  พิมพ์ข้อความเพื่อเริ่มการสนทนา
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[70%] rounded-2xl px-4 py-3 text-sm font-mono whitespace-pre-wrap leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          backgroundColor: `${accentColor}18`,
                          color: "var(--text-1)",
                          border: `1px solid ${accentColor}30`,
                        }
                      : {
                          backgroundColor: "var(--surface)",
                          color: "var(--text-1)",
                          border: "1px solid var(--border)",
                        }
                  }
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div
                  className="rounded-2xl px-4 py-3 text-sm font-mono"
                  style={{
                    backgroundColor: "var(--surface)",
                    color: "var(--text-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    thinking...
                  </motion.span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ── */}
        <div
          className="flex-shrink-0 border-t px-5 pt-3 pb-4 space-y-2"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          {/* Context bar */}
          {(modalState === "new-chat" || modalState === "session") && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono w-14" style={{ color: "var(--text-2)" }}>
                Context
              </span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                <div
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: `${(usedCount / MAX_CONTEXT) * 100}%`,
                    backgroundColor: isLimitReached ? "#ef4444" : accentColor,
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono w-8 text-right"
                style={{ color: isLimitReached ? "#ef4444" : "var(--text-2)" }}
              >
                {usedCount}/{MAX_CONTEXT}
              </span>
            </div>
          )}

          {isLimitReached ? (
            <div
              className="text-center py-3 rounded-xl text-xs font-mono"
              style={{
                backgroundColor: "#ef444412",
                color: "#ef4444",
                border: "1px solid #ef444428",
              }}
            >
              ถึง context limit แล้ว — กด New Chat เพื่อสนทนาต่อ
            </div>
          ) : (
            <div className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"
                disabled={!isInputActive}
                rows={2}
                className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm font-mono outline-none transition-all"
                style={{
                  backgroundColor: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-1)",
                  opacity: isInputActive ? 1 : 0.5,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="flex items-center justify-center w-12 h-12 rounded-xl border transition-all flex-shrink-0"
                style={{
                  backgroundColor: canSend ? `${accentColor}18` : "transparent",
                  borderColor: canSend ? `${accentColor}40` : "var(--border)",
                  color: canSend ? accentColor : "var(--text-2)",
                  opacity: canSend ? 1 : 0.4,
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
