"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User } from "lucide-react";
import { useAgentStore } from "@/store/agentStore";
import { useTheme } from "@/context/ThemeContext";
import { getStatusColor } from "@/lib/utils";
import type { Agent } from "@/types/agent";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SIMULATED_RESPONSES = [
  "Task received. Loading context into active memory window — 4096 tokens available.",
  "Running local inference on Ollama. Model warmed up, streaming output now.",
  "Acknowledged. Processing prompt through quantised weights. Throughput steady at ~28 tok/s.",
  "Context primed. Executing multi-step reasoning pipeline on this node.",
  "Input parsed. Delegating subtasks to available mesh peers if needed.",
];

interface AgentChatBoxProps {
  agent: Agent;
}

export function AgentChatBox({ agent }: AgentChatBoxProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useTheme();
  const color = getStatusColor(agent.status, isDark);

  const isBackendConnected = useAgentStore((s) => s.isBackendConnected);
  const appendChatMessage = useAgentStore((s) => s.appendChatMessage);
  const appendChatToken = useAgentStore((s) => s.appendChatToken);
  const finishChatMessage = useAgentStore((s) => s.finishChatMessage);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agent.chat]);

  const simulateResponse = useCallback(
    (assistantId: string) => {
      const text = SIMULATED_RESPONSES[Math.floor(Math.random() * SIMULATED_RESPONSES.length)];
      let i = 0;
      const tick = () => {
        if (i < text.length) {
          appendChatToken(agent.id, assistantId, text[i]);
          i++;
          setTimeout(tick, 12 + Math.random() * 18);
        } else {
          finishChatMessage(agent.id, assistantId);
        }
      };
      setTimeout(tick, 350);
    },
    [agent.id, appendChatToken, finishChatMessage]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    setIsSending(true);

    appendChatMessage(agent.id, {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    });

    if (isBackendConnected) {
      try {
        const res = await fetch(`${API_BASE}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, agent_id: agent.id, model: agent.model.name }),
        });
        if (res.ok) {
          const data = (await res.json()) as { task_id?: string; id?: string };
          const taskId = data.task_id ?? data.id ?? `asst-${Date.now()}`;
          appendChatMessage(agent.id, {
            id: taskId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            isStreaming: true,
          });
          setIsSending(false);
          return;
        }
      } catch { /* fall through */ }
    }

    const assistantId = `asst-${Date.now()}`;
    appendChatMessage(agent.id, {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    });
    setIsSending(false);
    simulateResponse(assistantId);
  }, [input, isSending, agent.id, agent.model.name, isBackendConnected, appendChatMessage, simulateResponse]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const blue  = isDark ? "#7CC7E8" : "#98D7F2";
  const green = isDark ? "#9FDCC4" : "#BFE8D2";

  return (
    <div
      className="flex flex-col rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--border)", height: 260 }}
    >
      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-2"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        {agent.chat.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 opacity-40">
            <Bot className="w-5 h-5" style={{ color: "var(--text-2)" }} />
            <span className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>
              chat with {agent.name}
            </span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {agent.chat.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex items-end gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: msg.role === "user" ? `${color}20` : `${blue}20`,
                  border: `1px solid ${msg.role === "user" ? color : blue}40`,
                }}
              >
                {msg.role === "user"
                  ? <User className="w-2.5 h-2.5" style={{ color }} />
                  : <Bot className="w-2.5 h-2.5" style={{ color: blue }} />
                }
              </div>

              {/* Bubble */}
              <div
                className="max-w-[80%] rounded-xl px-2.5 py-1.5 text-[11px] font-mono leading-relaxed"
                style={
                  msg.role === "user"
                    ? { backgroundColor: `${color}18`, color: "var(--text-1)", borderRadius: "12px 12px 4px 12px" }
                    : { backgroundColor: "var(--surface-2)", color: "var(--text-1)", borderRadius: "12px 12px 12px 4px" }
                }
              >
                {msg.content || (msg.isStreaming && (
                  <span className="flex gap-0.5 items-center h-3">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: blue }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </span>
                ))}
                {msg.isStreaming && msg.content && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-0.5 h-3 ml-0.5 align-middle"
                    style={{ backgroundColor: blue }}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 border-t"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`message ${agent.name.toLowerCase()}…`}
          disabled={isSending}
          className="flex-1 bg-transparent text-[11px] font-mono outline-none placeholder:opacity-40"
          style={{ color: "var(--text-1)" }}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => { e.stopPropagation(); handleSend(); }}
          disabled={!input.trim() || isSending}
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-opacity disabled:opacity-30"
          style={{ backgroundColor: `${green}20`, color: green }}
        >
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
