"use client";

import { motion } from "framer-motion";
import { getUsageColor } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface CircularGaugeProps {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function CircularGauge({ value, label, size = 56, strokeWidth = 4, color }: CircularGaugeProps) {
  const { isDark } = useTheme();
  const pct = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);
  const resolvedColor = color ?? getUsageColor(pct, isDark);
  const cx = size / 2, cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: resolvedColor }}
        >
          <span className="text-xs font-mono font-bold">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
        {label}
      </span>
    </div>
  );
}
