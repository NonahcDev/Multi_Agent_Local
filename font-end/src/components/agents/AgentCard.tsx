"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, Pause, RotateCcw, Plus, Wifi } from "lucide-react";
import Image from "next/image";
import ollamaLogo from "@/assets/logo/ollama_logo1.png";
import n8nLogo from "@/assets/logo/n8n_logo1.png";
import { StatusBadge } from "./StatusBadge";
import { HardwareMonitor } from "./HardwareMonitor";
import { TerminalLog } from "@/components/ui/TerminalLog";
import { ModelInfoPanel } from "./ModelInfoPanel";
import { getStatusColor } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import type { Agent } from "@/types/agent";

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onAssignTask?: () => void;
  onSelect?: () => void;
}

type TabKey = "hardware" | "history" | "logs";

const TABS: { key: TabKey; label: string }[] = [
  { key: "hardware", label: "HW" },
  { key: "history",  label: "HISTORY" },
  { key: "logs",     label: "MODEL" },
];

export function AgentCard({ agent, isSelected, onSelect, onAssignTask }: AgentCardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("hardware");
  const { isDark } = useTheme();
  const color = getStatusColor(agent.status, isDark);
  const queued  = agent.tasks.filter((t) => t.status === "queued").length;
  const running = agent.tasks.find((t) => t.status === "running");

  // Auto-switch to LOGS tab when a task starts running
  const hadRunning = useRef(false);
  useEffect(() => {
    const isRunning = !!running;
    if (isRunning && !hadRunning.current) setActiveTab("logs");
    hadRunning.current = isRunning;
  }, [running]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onSelect}
      className="relative rounded-xl border overflow-hidden cursor-pointer"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: isSelected ? color : "var(--border)",
        boxShadow: isSelected
          ? `0 0 0 1px ${color}50, 0 4px 20px var(--shadow-md)`
          : "0 4px 16px var(--shadow)",
      }}
    >
      {/* top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }}
      />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden mt-0.5"
              style={{ border: `1px solid ${color}30` }}
            >
              {agent.backend === "n8n" ? (
                <Image src={n8nLogo} alt="n8n" width={32} height={32} className="w-full h-full object-cover" />
              ) : agent.backend === "ollama" || !agent.backend ? (
                <Image src={ollamaLogo} alt="Ollama" width={32} height={32} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                  <Server className="w-4 h-4" style={{ color }} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3
                className="font-mono font-bold text-sm leading-tight truncate"
                style={{ color: "var(--text-1)" }}
              >
                {agent.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Wifi className="w-2.5 h-2.5" style={{ color: "var(--text-2)" }} />
                <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-2)" }}>
                  {agent.hostname} · {agent.ipAddress}
                </span>
              </div>
            </div>
          </div>
          <StatusBadge status={agent.status} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "TPS",   value: agent.model.tokensPerSec.toFixed(0), color },
            { label: "Queue", value: String(queued), color: isDark ? "#7CC7E8" : "#98D7F2" },
            { label: "GPU%",  value: agent.hardware.gpuUsage.toFixed(0), color },
          ].map(({ label, value, color: c }) => (
            <div
              key={label}
              className="rounded-lg p-1.5 border"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <div
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: "var(--text-2)" }}
              >
                {label}
              </div>
              <motion.div
                key={value}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-mono font-bold"
                style={{ color: c }}
              >
                {value}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Active task ticker */}
        {running && (
          <div
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 border"
            style={{
              backgroundColor: `${color}08`,
              borderColor: `${color}25`,
            }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-[10px] font-mono truncate" style={{ color: `${color}CC` }}>
              {running.description}
            </span>
            <span className="text-[10px] font-mono ml-auto flex-shrink-0" style={{ color: "var(--text-2)" }}>
              {running.progress.toFixed(0)}%
            </span>
          </div>
        )}

        {/* Tab nav */}
        <div
          className="flex gap-1 rounded-lg p-0.5"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={(e) => { e.stopPropagation(); setActiveTab(tab.key); }}
              className="flex-1 relative py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md transition-colors"
              style={{
                color: activeTab === tab.key ? color : "var(--text-2)",
                backgroundColor: activeTab === tab.key ? `${color}15` : "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "hardware" && (
              <HardwareMonitor hardware={agent.hardware} history={agent.history} />
            )}
            {activeTab === "history" && (
              agent.backend === "n8n" ? (
                <div className="flex items-center justify-center h-20" style={{ color: "var(--text-2)" }}>
                  <span className="text-2xl font-mono font-bold opacity-30">✕</span>
                </div>
              ) : (
                <TerminalLog logs={agent.logs} maxVisible={7} />
              )
            )}
            {activeTab === "logs" && (
              <ModelInfoPanel model={agent.model} history={agent.history} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer actions */}
        <div
          className="flex items-center gap-2 pt-1 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          {[{ icon: Pause, label: "Pause" }, { icon: RotateCcw, label: "Restart" }].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
              style={{ color: "var(--text-2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon className="w-2.5 h-2.5" />
              {label}
            </button>
          ))}
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all ml-auto border"
            style={{
              color,
              borderColor: `${color}30`,
              backgroundColor: `${color}10`,
            }}
            onClick={(e) => { e.stopPropagation(); onAssignTask?.(); }}
          >
            <Plus className="w-2.5 h-2.5" />
            Assign Task
          </button>
        </div>
      </div>
    </motion.div>
  );
}
