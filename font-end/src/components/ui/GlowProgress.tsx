"use client";

import { motion } from "framer-motion";
import { getUsageColor } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface GlowProgressProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  label?: string;
  showValue?: boolean;
  animate?: boolean;
}

export function GlowProgress({
  value,
  max = 100,
  color,
  height = 4,
  label,
  showValue = true,
  animate = true,
}: GlowProgressProps) {
  const { isDark } = useTheme();
  const pct = Math.min(100, (value / max) * 100);
  const resolvedColor = color ?? getUsageColor(pct, isDark);

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: "var(--text-2)" }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-xs font-mono" style={{ color: resolvedColor }}>
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, backgroundColor: "var(--border)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: resolvedColor }}
          initial={animate ? { width: 0 } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
