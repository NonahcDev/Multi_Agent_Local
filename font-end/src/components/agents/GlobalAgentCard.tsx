"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Send, Loader2, Play, Trash2, Wrench } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { PlanView } from "./PlanView";
import { getStatusColor } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { useAgentStore } from "@/store/agentStore";
import type { Agent, LogEntry } from "@/types/agent";

const BACKEND = "http://localhost:8000";

interface GlobalAgentCardProps {
  agent: Agent;
  workerAgents: Agent[];
  onRunTask: (prompt: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function GlobalAgentCard({
  agent,
  workerAgents,
  onRunTask,
  isSelected,
  onSelect,
}: GlobalAgentCardProps) {
  const { isDark } = useTheme();
  const accent = isDark ? "#F5C542" : "#C89A10";

  const currentPlan  = useAgentStore((s) => s.currentPlan);
  const setPlan      = useAgentStore((s) => s.setPlan);
  const clearPlan    = useAgentStore((s) => s.clearPlan);
  const appendLog    = useAgentStore((s) => s.appendLog);

  const [prompt, setPrompt]         = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showTools, setShowTools]   = useState(false);
  const [tools, setTools]           = useState<{ name: string; description: string; success_rate: number }[]>([]);

  function ts(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  }

  const levelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":  return isDark ? "#F4A8C8" : "#E07090";
      case "warn":   return isDark ? "#F5C542" : "#C89A10";
      case "stream": return isDark ? "#8ED9B9" : "#5DAF8A";
      case "debug":  return isDark ? "#7A7595" : "#A89888";
      default:       return "var(--text-2)";
    }
  };

  const levelLabel = (level: LogEntry["level"]) => {
    const map = { info: "INF", warn: "WRN", error: "ERR", debug: "DBG", stream: "STR" };
    return map[level] ?? level.toUpperCase().slice(0, 3);
  };

  const activeCount = workerAgents.filter(
    (a) => a.status !== "offline" && a.status !== "error"
  ).length;

  const running = agent.tasks.find((t) => t.status === "running");

  // ── Plan ────────────────────────────────────────────────────────────────────

  const handlePlan = async () => {
    if (!prompt.trim() || isPlanning) return;
    setIsPlanning(true);
    appendLog(agent.id, { id: `plan-${Date.now()}`, timestamp: ts(), level: "info", message: `Planning: ${prompt}`, source: "global" });

    try {
      const res = await fetch(`${BACKEND}/global/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const plan = await res.json();
      setPlan(plan);
      appendLog(agent.id, { id: `plan-ok-${Date.now()}`, timestamp: ts(), level: "info", message: `Plan created: ${plan.tasks.length} tasks`, source: "global" });
    } catch (e) {
      appendLog(agent.id, { id: `plan-err-${Date.now()}`, timestamp: ts(), level: "error", message: `Plan failed: ${String(e)}`, source: "global" });
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecute = async () => {
    if (!currentPlan || isExecuting) return;
    setIsExecuting(true);
    appendLog(agent.id, { id: `exec-${Date.now()}`, timestamp: ts(), level: "info", message: `Executing plan: ${currentPlan.goal}`, source: "global" });

    try {
      const res = await fetch(`${BACKEND}/global/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: currentPlan.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      appendLog(agent.id, { id: `exec-ok-${Date.now()}`, timestamp: ts(), level: "info", message: "Execution started (running in background)", source: "global" });
    } catch (e) {
      appendLog(agent.id, { id: `exec-err-${Date.now()}`, timestamp: ts(), level: "error", message: `Execute failed: ${String(e)}`, source: "global" });
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePlanAndExecute = async () => {
    if (!prompt.trim() || isPlanning || isExecuting) return;
    setIsPlanning(true);
    appendLog(agent.id, { id: `plan-${Date.now()}`, timestamp: ts(), level: "info", message: `Planning: ${prompt}`, source: "global" });

    try {
      const res = await fetch(`${BACKEND}/global/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const plan = await res.json();
      setPlan(plan);
      setIsPlanning(false);
      setPrompt("");

      appendLog(agent.id, { id: `plan-ok-${Date.now()}`, timestamp: ts(), level: "info", message: `Plan created: ${plan.tasks.length} tasks — starting execution`, source: "global" });

      setIsExecuting(true);
      const execRes = await fetch(`${BACKEND}/global/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      if (!execRes.ok) throw new Error(`Execute HTTP ${execRes.status}`);
      appendLog(agent.id, { id: `exec-ok-${Date.now()}`, timestamp: ts(), level: "info", message: "Execution started", source: "global" });
    } catch (e) {
      appendLog(agent.id, { id: `err-${Date.now()}`, timestamp: ts(), level: "error", message: String(e), source: "global" });
    } finally {
      setIsPlanning(false);
      setIsExecuting(false);
    }
  };

  const handleLoadTools = async () => {
    try {
      const res = await fetch(`${BACKEND}/global/tools`);
      const data = await res.json();
      setTools(data.tools ?? []);
      setShowTools(true);
    } catch {
      setShowTools((v) => !v);
    }
  };

  const isBusy = isPlanning || isExecuting;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onClick={onSelect}
      className="relative rounded-xl border overflow-hidden cursor-pointer"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: isSelected ? accent : `${accent}35`,
        boxShadow: isSelected
          ? `0 0 0 1px ${accent}40, 0 6px 28px ${accent}18`
          : `0 4px 20px var(--shadow), 0 0 0 1px ${accent}18`,
      }}
    >
      {/* gold accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent 5%, ${accent}CC 40%, ${accent}CC 60%, transparent 95%)`,
        }}
      />

      <div className="p-4 space-y-3">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${accent}25, ${accent}10)`,
                border: `1px solid ${accent}40`,
              }}
            >
              <Crown className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm tracking-wide" style={{ color: "var(--text-1)" }}>
                  GLOBAL AGENT
                </span>
                <span
                  className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
                >
                  ORCHESTRATOR
                </span>
              </div>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-2)" }}>
                localhost:11434 · {agent.model.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] font-mono font-bold" style={{ color: accent }}>
                {activeCount}/{workerAgents.length}
              </div>
              <div className="text-[9px] font-mono" style={{ color: "var(--text-2)" }}>
                agents active
              </div>
            </div>
            <StatusBadge status={agent.status} />
          </div>
        </div>

        {/* ── 2-column body ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* COL 1 — Agent Roster */}
          <div className="rounded-lg p-2.5 border" style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}>
            <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--text-2)" }}>
              Agent Roster
            </div>
            <div className="space-y-1.5">
              {workerAgents.map((wa) => {
                const wc = getStatusColor(wa.status, isDark);
                return (
                  <div key={wa.id} className="flex items-center gap-2 min-w-0">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: wc }}
                      animate={wa.status === "thinking" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-[10px] font-mono flex-1 truncate" style={{ color: "var(--text-1)" }}>
                      {wa.name}
                    </span>
                    <span className="text-[9px] font-mono flex-shrink-0" style={{ color: wc }}>
                      {wa.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COL 2 — Task Input */}
          <div className="space-y-2">
            <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
              Assign to Global Agent
            </div>

            {/* Active task ticker */}
            {running && (
              <div
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 border"
                style={{ backgroundColor: `${accent}08`, borderColor: `${accent}25` }}
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: accent }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[10px] font-mono truncate flex-1" style={{ color: `${accent}CC` }}>
                  {running.description}
                </span>
                <span className="text-[10px] font-mono ml-auto flex-shrink-0" style={{ color: "var(--text-2)" }}>
                  {running.progress.toFixed(0)}%
                </span>
              </div>
            )}

            <textarea
              value={prompt}
              onChange={(e) => { e.stopPropagation(); setPrompt(e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.stopPropagation();
                  handlePlanAndExecute();
                }
              }}
              placeholder="Assign a task to the global agent..."
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-[11px] font-mono resize-none border outline-none"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-1)" }}
            />

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Plan only */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); handlePlan(); }}
                disabled={!prompt.trim() || isBusy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all"
                style={{
                  backgroundColor: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-2)",
                  opacity: !prompt.trim() || isBusy ? 0.4 : 1,
                }}
              >
                {isPlanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Plan
              </motion.button>

              {/* Plan + Execute */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); handlePlanAndExecute(); }}
                disabled={!prompt.trim() || isBusy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all"
                style={{
                  backgroundColor: `${accent}18`,
                  borderColor: `${accent}45`,
                  color: accent,
                  opacity: !prompt.trim() || isBusy ? 0.4 : 1,
                }}
              >
                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {isBusy ? (isPlanning ? "Planning..." : "Executing...") : "Run"}
              </motion.button>

              {/* Execute existing plan */}
              {currentPlan && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); handleExecute(); }}
                  disabled={isExecuting}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-mono border transition-all"
                  style={{
                    backgroundColor: "#4ade8018",
                    borderColor: "#4ade8045",
                    color: "#4ade80",
                    opacity: isExecuting ? 0.4 : 1,
                  }}
                  title="Re-execute current plan"
                >
                  <Play className="w-3 h-3" />
                </motion.button>
              )}

              {/* Clear plan */}
              {currentPlan && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); clearPlan(); }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-mono border transition-all"
                  style={{
                    backgroundColor: "#f8717118",
                    borderColor: "#f8717145",
                    color: "#f87171",
                  }}
                  title="Clear plan"
                >
                  <Trash2 className="w-3 h-3" />
                </motion.button>
              )}

              <span className="text-[9px] font-mono ml-auto" style={{ color: "var(--text-2)" }}>
                Ctrl+Enter
              </span>
            </div>
          </div>
        </div>

        {/* ── Plan View ── */}
        <AnimatePresence>
          {currentPlan && (
            <PlanView key={currentPlan.id} plan={currentPlan} />
          )}
        </AnimatePresence>

        {/* ── Tool Registry ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleLoadTools(); }}
            className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest transition-colors"
            style={{ color: showTools ? accent : "var(--text-2)" }}
          >
            <Wrench className="w-2.5 h-2.5" />
            Tool Registry
          </button>
        </div>

        <AnimatePresence>
          {showTools && tools.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg border overflow-hidden"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <div className="px-3 py-2 space-y-1.5">
                {tools.map((tool) => (
                  <div key={tool.name} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono" style={{ color: accent }}>
                      {tool.name}
                    </span>
                    <span className="text-[9px] font-mono flex-1 truncate" style={{ color: "var(--text-2)" }}>
                      {tool.description}
                    </span>
                    <span className="text-[9px] font-mono flex-shrink-0" style={{ color: tool.success_rate > 0.8 ? "#4ade80" : "#fb923c" }}>
                      {(tool.success_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Logs ── */}
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
              Agent Logs
            </span>
            <span className="text-[9px] font-mono" style={{ color: "var(--text-2)" }}>
              {agent.logs.length} entries
            </span>
          </div>

          <div className="h-28 overflow-y-auto px-3 py-2 space-y-0.5">
            {agent.logs.length === 0 ? (
              <p className="text-[10px] font-mono pt-2 text-center" style={{ color: "var(--text-2)" }}>
                No logs yet
              </p>
            ) : (
              [...agent.logs].reverse().map((log) => (
                <div key={log.id} className="flex items-start gap-2 min-w-0">
                  <span className="text-[9px] font-mono flex-shrink-0 mt-px font-bold" style={{ color: levelColor(log.level) }}>
                    {levelLabel(log.level)}
                  </span>
                  <span className="text-[9px] font-mono flex-shrink-0" style={{ color: "var(--text-2)", opacity: 0.6 }}>
                    {log.timestamp}
                  </span>
                  <span className="text-[10px] font-mono break-all leading-tight" style={{ color: "var(--text-1)" }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
