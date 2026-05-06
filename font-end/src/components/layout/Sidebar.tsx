"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard, Workflow, Server, HardDrive, BookMarked,
  FileText, Settings, Activity, Database, Network,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

const MAIN_NAV = [
  { icon: LayoutDashboard, label: "Dashboard",     href: "/" },
  { icon: Workflow,        label: "Workflows",      href: "#" },
  { icon: Server,          label: "Agents Cluster", href: "#" },
  { icon: HardDrive,       label: "Models Hub",     href: "#" },
  { icon: BookMarked,      label: "Presets",        href: "/presets" },
  { icon: Activity,        label: "Hardware",       href: "#" },
  { icon: Network,         label: "Network",        href: "#" },
  { icon: Database,        label: "Database",       href: "/database" },
];

const BOTTOM_NAV = [
  { icon: FileText, label: "Logs",     href: "#" },
  { icon: Settings, label: "Settings", href: "#" },
];

export function Sidebar() {
  const { isDark } = useTheme();
  const pathname   = usePathname();

  const accentBlue = isDark ? "#7CC7E8" : "#98D7F2";
  const accentPink = isDark ? "#F2A7B5" : "#FDBDC9";

  const itemClass = "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-mono transition-all relative";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${accentBlue}35, ${accentPink}35)`,
            border: `1px solid ${accentBlue}50`,
          }}>
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

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {MAIN_NAV.map(({ icon: Icon, label, href }) => {
          const active = isActive(href);
          return (
            <Link key={label} href={href} className={itemClass}
              style={{
                backgroundColor: active ? `${accentBlue}12` : "transparent",
                color: active ? accentBlue : "var(--text-2)",
              }}>
              {active && (
                <div className="absolute left-0 inset-y-2 w-0.5 rounded-r-full"
                  style={{ backgroundColor: accentBlue }} />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="py-4 space-y-0.5 px-2 border-t" style={{ borderColor: "var(--divider)" }}>
        {BOTTOM_NAV.map(({ icon: Icon, label, href }) => (
          <Link key={label} href={href} className={itemClass} style={{ color: "var(--text-2)" }}>
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </motion.aside>
  );
}
