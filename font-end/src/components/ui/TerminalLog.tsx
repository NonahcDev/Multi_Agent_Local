"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import type { LogEntry } from "@/types/agent";

const LEVEL_LABELS: Record<LogEntry["level"], string> = {
  info:   "INF",
  warn:   "WRN",
  error:  "ERR",
  debug:  "DBG",
  stream: "STR",
};

interface TerminalLogProps {
  logs: LogEntry[];
  maxVisible?: number;
  className?: string;
  hideHeader?: boolean;
}

export function TerminalLog({ logs, maxVisible = 6, className = "", hideHeader = false }: TerminalLogProps) {
  const { isDark } = useTheme();
  const visible = logs.slice(-maxVisible);

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

  return (
    <div
      className={`rounded-lg border font-mono text-xs overflow-hidden ${className}`}
      style={{
        minHeight: 100,
        backgroundColor: "var(--bg-primary)",
        borderColor: "var(--border)",
      }}
    >
      {!hideHeader && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-b"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}
        >
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pink + "99" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: green + "99" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: blue + "99" }} />
          </div>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "var(--text-2)" }}>terminal</span>
        </div>
      )}
      <div className="p-2 space-y-0.5 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 items-start leading-relaxed"
            >
              <span className="text-[10px] shrink-0" style={{ color: "var(--text-2)" }} suppressHydrationWarning>
                {log.timestamp}
              </span>
              <span className="shrink-0 text-[10px] font-bold w-7" style={{ color: LEVEL_COLORS[log.level] }}>
                {LEVEL_LABELS[log.level]}
              </span>
              <span
                className={log.level === "stream" ? "break-words min-w-0 line-clamp-6" : "truncate"}
                style={{ color: "var(--text-1)" }}
              >
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
