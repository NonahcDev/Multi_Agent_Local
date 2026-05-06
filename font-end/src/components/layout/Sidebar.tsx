"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard, Workflow, Server, HardDrive, BookMarked,
  FileText, Settings, Activity, Database, Network, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export type AppTab =
  | "dashboard" | "workflows" | "agents" | "models"
  | "presets" | "hardware" | "network" | "database"
  | "logs" | "settings";

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const MAIN_NAV: { icon: React.ElementType; label: string; tab: AppTab }[] = [
  { icon: LayoutDashboard, label: "Dashboard",     tab: "dashboard" },
  { icon: Workflow,        label: "Workflows",      tab: "workflows" },
  { icon: Server,          label: "Agents Cluster", tab: "agents" },
  { icon: HardDrive,       label: "Models Hub",     tab: "models" },
  { icon: BookMarked,      label: "Presets",        tab: "presets" },
  { icon: Activity,        label: "Hardware",       tab: "hardware" },
  { icon: Network,         label: "Network",        tab: "network" },
  { icon: Database,        label: "Database",       tab: "database" },
];

const BOTTOM_NAV: { icon: React.ElementType; label: string; tab: AppTab }[] = [
  { icon: FileText, label: "Logs",     tab: "logs" },
  { icon: Settings, label: "Settings", tab: "settings" },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { isDark, toggleTheme } = useTheme();

  const accentBlue = isDark ? "#7CC7E8" : "#98D7F2";
  const accentPink = isDark ? "#F2A7B5" : "#FDBDC9";

  const btnClass =
    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-mono transition-all relative w-full text-left";

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col w-56 shrink-0 border-r"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b" style={{ borderColor: "var(--divider)" }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${accentBlue}35, ${accentPink}35)`,
            border: `1px solid ${accentBlue}50`,
          }}
        >
          <span className="text-xs font-mono font-black" style={{ color: accentBlue }}>AI</span>
        </div>
        <div>
          <span className="text-sm font-bold font-mono tracking-wider" style={{ color: "var(--text-1)" }}>
            LocalAI
          </span>
          <span className="text-sm font-bold font-mono tracking-wider" style={{ color: accentBlue }}>
            {" "}Mesh
          </span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {MAIN_NAV.map(({ icon: Icon, label, tab }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={btnClass}
              style={{
                backgroundColor: active ? `${accentBlue}12` : "transparent",
                color: active ? accentBlue : "var(--text-2)",
              }}
            >
              {active && (
                <div
                  className="absolute left-0 inset-y-2 w-0.5 rounded-r-full"
                  style={{ backgroundColor: accentBlue }}
                />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="py-4 space-y-0.5 px-2 border-t" style={{ borderColor: "var(--divider)" }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={btnClass}
          style={{ color: "var(--text-2)" }}
        >
          {isDark
            ? <Sun  className="w-4 h-4 shrink-0" />
            : <Moon className="w-4 h-4 shrink-0" />}
          <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {BOTTOM_NAV.map(({ icon: Icon, label, tab }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={btnClass}
              style={{
                backgroundColor: active ? `${accentBlue}12` : "transparent",
                color: active ? accentBlue : "var(--text-2)",
              }}
            >
              {active && (
                <div
                  className="absolute left-0 inset-y-2 w-0.5 rounded-r-full"
                  style={{ backgroundColor: accentBlue }}
                />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </motion.aside>
  );
}
