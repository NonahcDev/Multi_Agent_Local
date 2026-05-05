"use client";

import { motion } from "framer-motion";
import { Bell, User, Activity, Cpu, Server, Zap, ListTodo } from "lucide-react";
import type { SystemStats } from "@/types/agent";
import { formatBytes } from "@/lib/utils";
import { WsStatusBadge } from "@/components/ui/WsStatusBadge";
import { useTheme } from "@/context/ThemeContext";
import type { WsStatus } from "@/hooks/useBackendWS";

interface TopBarProps {
  stats: SystemStats;
  wsStatus: WsStatus;
}

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
      style={{
        borderColor: `${color}30`,
        backgroundColor: `${color}0C`,
      }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <span className="text-[11px] font-mono" style={{ color: "var(--text-2)" }}>{label}:</span>
      <motion.span
        key={value}
        initial={{ opacity: 0.5, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[11px] font-mono font-bold"
        style={{ color }}
      >
        {value}
      </motion.span>
    </div>
  );
}

export function TopBar({ stats, wsStatus }: TopBarProps) {
  const { isDark } = useTheme();
  const blue  = isDark ? "#7CC7E8" : "#98D7F2";
  const green = isDark ? "#9FDCC4" : "#BFE8D2";
  const pink  = isDark ? "#F2A7B5" : "#FDBDC9";

  return (
    <header
      className="flex items-center gap-4 px-5 py-3 border-b shrink-0"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-3 flex-1 flex-wrap">
        <StatPill icon={Server}   label="Active Agents" value={String(stats.activeAgents)}                                      color={blue}  />
        <StatPill icon={Cpu}      label="Total GPUs"    value={String(stats.totalGPUs)}                                         color={pink}  />
        <StatPill icon={Activity} label="Avg. TPS"      value={`${stats.avgTPS} tok/s`}                                         color={green} />
        <StatPill icon={Zap}      label="VRAM Usage"    value={`${formatBytes(stats.totalVRAM.used)}/${formatBytes(stats.totalVRAM.total)}`} color={green} />
        <StatPill icon={ListTodo} label="Tasks Queued"  value={String(stats.tasksQueued)}                                       color={pink}  />
        <WsStatusBadge status={wsStatus} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
            color: "var(--text-2)",
          }}
        >
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: pink }}
          />
        </motion.button>

        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${blue}, ${pink})` }}
          >
            <User className="w-3 h-3" style={{ color: "var(--surface)" }} />
          </div>
          <span className="text-xs font-mono" style={{ color: "var(--text-2)" }}>dev@mesh.local</span>
        </div>
      </div>
    </header>
  );
}
