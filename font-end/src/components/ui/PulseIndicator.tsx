"use client";

import { motion } from "framer-motion";
import { getStatusColor } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import type { AgentStatus } from "@/types/agent";

interface PulseIndicatorProps {
  status: AgentStatus;
  size?: number;
}

export function PulseIndicator({ status, size = 10 }: PulseIndicatorProps) {
  const { isDark } = useTheme();
  const color = getStatusColor(status, isDark);
  const isAnimated = status !== "offline" && status !== "error";

  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {isAnimated && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color, opacity: 0.35 }}
          animate={{ scale: [1, 2.0, 1], opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span
        className="relative rounded-full inline-block"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
}
