"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import type { WsStatus } from "@/hooks/useBackendWS";

interface WsStatusBadgeProps {
  status: WsStatus;
}

export function WsStatusBadge({ status }: WsStatusBadgeProps) {
  const { isDark } = useTheme();

  const blue  = isDark ? "#7CC7E8" : "#98D7F2";
  const green = isDark ? "#9FDCC4" : "#BFE8D2";
  const pink  = isDark ? "#F2A7B5" : "#FDBDC9";
  const gray  = isDark ? "#A8A29E" : "#8C8C8C";

  const CONFIG: Record<WsStatus, { color: string; label: string; animate: boolean }> = {
    connected:    { color: green, label: "LIVE",        animate: true  },
    connecting:   { color: blue,  label: "CONNECTING…", animate: true  },
    disconnected: { color: gray,  label: "SIMULATED",   animate: false },
    error:        { color: pink,  label: "WS ERROR",    animate: false },
  };

  const { color, label, animate } = CONFIG[status];

  return (
    <motion.div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-widest"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}12`, color }}
      animate={animate ? { opacity: [1, 0.6, 1] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </motion.div>
  );
}
