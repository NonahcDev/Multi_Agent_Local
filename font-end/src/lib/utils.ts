import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(gb: number): string {
  if (gb >= 1) return `${gb.toFixed(1)}GB`;
  return `${(gb * 1024).toFixed(0)}MB`;
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

const STATUS_COLORS_DARK: Record<string, string> = {
  online:   "#7CC7E8",
  thinking: "#F2A7B5",
  idle:     "#9FDCC4",
  error:    "#F2A7B5",
  offline:  "#A8A29E",
};

const STATUS_COLORS_LIGHT: Record<string, string> = {
  online:   "#98D7F2",
  thinking: "#FDBDC9",
  idle:     "#BFE8D2",
  error:    "#FDBDC9",
  offline:  "#8C8C8C",
};

export function getStatusColor(status: string, isDark = true): string {
  const map = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  return map[status] ?? (isDark ? "#A8A29E" : "#8C8C8C");
}

export function getStatusLabel(status: string): string {
  return status.toUpperCase();
}

export function getUsageColor(pct: number, isDark = true): string {
  if (isDark) {
    if (pct >= 90) return "#F2A7B5";
    if (pct >= 70) return "#9FDCC4";
    return "#7CC7E8";
  }
  if (pct >= 90) return "#FDBDC9";
  if (pct >= 70) return "#BFE8D2";
  return "#98D7F2";
}
