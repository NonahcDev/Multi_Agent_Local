"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface AssignTaskModalProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onSubmit: (agentId: string, prompt: string) => void;
}

export function AssignTaskModal({ agentId, agentName, onClose, onSubmit }: AssignTaskModalProps) {
  const [prompt, setPrompt] = useState("");
  const { isDark } = useTheme();
  const blue = isDark ? "#8EB8FF" : "#98D7F2";
  const green = isDark ? "#9FDCC4" : "#BFE8D2";

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onSubmit(agentId, prompt.trim());
    onClose();
  };

  const canSubmit = prompt.trim().length > 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />

        {/* modal */}
        <motion.div
          className="relative w-full max-w-md rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-strong)", boxShadow: "0 24px 64px var(--shadow-md)" }}
          initial={{ scale: 0.95, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 8, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* top accent */}
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, transparent, ${blue}90, transparent)` }}
          />

          <div className="p-5 space-y-4">
            {/* header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-mono font-bold" style={{ color: "var(--text-1)" }}>
                  Assign Task
                </h2>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-2)" }}>
                  → {agentName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md transition-colors"
                style={{ color: "var(--text-2)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* prompt input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-2)" }}>
                Prompt
              </label>
              <textarea
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                  if (e.key === "Escape") onClose();
                }}
                placeholder="Describe what the agent should do..."
                rows={5}
                className="w-full rounded-lg border p-3 text-sm font-mono resize-none focus:outline-none transition-colors"
                style={{
                  backgroundColor: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-1)",
                }}
              />
              <p className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>
                Ctrl+Enter to submit · Esc to cancel
              </p>
            </div>

            {/* quick prompts */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-2)" }}>
                Quick prompts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Summarize the latest system logs",
                  "List running processes",
                  "Check disk usage",
                  "Say hello",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setPrompt(q)}
                    className="px-2 py-1 rounded-md text-[10px] font-mono border transition-colors"
                    style={{
                      backgroundColor: `${green}10`,
                      borderColor: `${green}30`,
                      color: green,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* actions */}
            <div className="flex justify-end gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border transition-colors"
                style={{ color: "var(--text-2)", borderColor: "var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border transition-all"
                style={{
                  backgroundColor: canSubmit ? `${blue}18` : "transparent",
                  borderColor: canSubmit ? `${blue}50` : "var(--border)",
                  color: canSubmit ? blue : "var(--text-2)",
                  opacity: canSubmit ? 1 : 0.5,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                <Play className="w-3 h-3" />
                Run Task
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
