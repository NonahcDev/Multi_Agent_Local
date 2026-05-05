"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Search } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { LogEntry, Agent } from "@/types/agent";

interface LiveLogConsoleProps {
  agents: Agent[];
}

export function LiveLogConsole({ agents }: LiveLogConsoleProps) {
  const [filter, setFilter] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  const blue  = isDark ? "#7CC7E8" : "#98D7F2";
  const green = isDark ? "#9FDCC4" : "#BFE8D2";
  const pink  = isDark ? "#F2A7B5" : "#FDBDC9";

  const LEVEL_COLORS: Record<LogEntry["level"], string> = {
    info:   blue,
    warn:   green,
    error:  pink,
    debug:  "var(--text-2)",
    stream: pink,
  };

  const allLogs: (LogEntry & { agentName: string })[] = agents
    .flatMap((a) => a.logs.map((l) => ({ ...l, agentName: a.name })))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-40);

  const filtered = filter
    ? allLogs.filter(
        (l) =>
          l.message.toLowerCase().includes(filter.toLowerCase()) ||
          l.agentName.toLowerCase().includes(filter.toLowerCase())
      )
    : allLogs;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allLogs.length]);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      {/* header */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pink + "99" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: green + "99" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: blue + "99" }} />
        </div>
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
          Live Log Console
        </span>
        <div className="flex-1" />
        <div
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 border"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)" }}
        >
          <Search className="w-3 h-3" style={{ color: "var(--text-2)" }} />
          <input
            type="text"
            placeholder="Search…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-xs font-mono outline-none w-28"
            style={{ color: "var(--text-1)" }}
          />
        </div>
        <button style={{ color: "var(--text-2)" }}>
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button style={{ color: "var(--text-2)" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* log lines */}
      <div className="h-36 overflow-y-auto px-3 py-2 space-y-0.5 font-mono text-[11px]">
        <AnimatePresence initial={false} mode="popLayout">
          {filtered.slice(-20).map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2 items-start leading-relaxed"
            >
              <span className="shrink-0" style={{ color: "var(--text-2)" }} suppressHydrationWarning>{log.timestamp}</span>
              <span
                className="shrink-0 font-bold"
                style={{ color: LEVEL_COLORS[log.level] }}
              >
                agent [mesh]
              </span>
              <span style={{ color: "var(--text-1)" }}>{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
