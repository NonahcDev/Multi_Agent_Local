"use client";

import { motion } from "framer-motion";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import type { AgentStatus } from "@/types/agent";
import { PulseIndicator } from "@/components/ui/PulseIndicator";

interface StatusBadgeProps {
  status: AgentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { isDark } = useTheme();
  const color = getStatusColor(status, isDark);

  return (
    <motion.div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}12` }}
      animate={status === "thinking" ? { opacity: [1, 0.7, 1] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <PulseIndicator status={status} size={7} />
      <span
        className="text-[10px] font-mono font-bold tracking-widest"
        style={{ color }}
      >
        {getStatusLabel(status)}
      </span>
    </motion.div>
  );
}
