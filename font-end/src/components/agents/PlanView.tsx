"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, XCircle, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { TaskPlan, PlanTask, PlanTaskStatus } from "@/types/agent";

interface PlanViewProps {
  plan: TaskPlan;
}

function statusIcon(status: PlanTaskStatus, accent: string) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#4ade80" }} />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5" style={{ color: "#f87171" }} />;
    case "running":
      return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: accent }} />;
    default:
      return <Circle className="w-3.5 h-3.5" style={{ color: "var(--text-2)", opacity: 0.4 }} />;
  }
}

function statusColor(status: PlanTaskStatus): string {
  switch (status) {
    case "done":    return "#4ade80";
    case "failed":  return "#f87171";
    case "running": return "#facc15";
    default:        return "var(--text-2)";
  }
}

function PlanTaskRow({ task, accent, isLast }: { task: PlanTask; accent: string; isLast: boolean }) {
  const hasDep = task.depends_on !== null || task.input_from !== null;
  const color = statusColor(task.status);

  return (
    <div className="flex items-start gap-2 min-w-0">
      {/* vertical connector */}
      <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
        {statusIcon(task.status, accent)}
        {!isLast && (
          <div
            className="w-px flex-1 mt-1"
            style={{
              minHeight: "16px",
              backgroundColor: task.status === "done" ? "#4ade80" : "var(--border)",
            }}
          />
        )}
      </div>

      {/* content */}
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${color}18`,
              color,
              border: `1px solid ${color}35`,
            }}
          >
            {task.action}
          </span>
          {hasDep && (
            <span className="flex items-center gap-0.5 text-[9px] font-mono" style={{ color: "var(--text-2)" }}>
              <ArrowRight className="w-2.5 h-2.5" />
              from {task.depends_on ?? task.input_from}
            </span>
          )}
          {task.retry > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] font-mono" style={{ color: "#fb923c" }}>
              <RefreshCw className="w-2.5 h-2.5" />
              retry {task.retry}/{task.max_retry}
            </span>
          )}
        </div>

        <p className="text-[10px] font-mono mt-0.5 leading-relaxed break-words" style={{ color: "var(--text-1)" }}>
          {task.description || `Task ${task.id}`}
        </p>

        {task.error && (
          <p className="text-[9px] font-mono mt-0.5 break-words" style={{ color: "#f87171" }}>
            {task.error.slice(0, 120)}
          </p>
        )}

        {task.result && task.status === "done" && (
          <p className="text-[9px] font-mono mt-0.5 break-words" style={{ color: "#86efac", opacity: 0.8 }}>
            {task.result.slice(0, 100)}{task.result.length > 100 ? "…" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export function PlanView({ plan }: PlanViewProps) {
  const { isDark } = useTheme();
  const accent = isDark ? "#F5C542" : "#C89A10";

  const done  = plan.tasks.filter((t) => t.status === "done").length;
  const total = plan.tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const planStatusColor =
    plan.status === "done"    ? "#4ade80" :
    plan.status === "failed"  ? "#f87171" :
    plan.status === "running" ? accent    : "var(--text-2)";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
            Execution Plan
          </span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
            style={{
              backgroundColor: `${planStatusColor}18`,
              color: planStatusColor,
              border: `1px solid ${planStatusColor}35`,
            }}
          >
            {plan.status}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[9px] font-mono" style={{ color: "var(--text-2)" }}>
            {done}/{total} · iter {plan.iteration}
          </span>
          <div
            className="w-16 h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--border)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: planStatusColor }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Goal */}
      <div className="px-3 pt-2">
        <p className="text-[10px] font-mono leading-relaxed" style={{ color: accent }}>
          Goal: {plan.goal}
        </p>
      </div>

      {/* Task list */}
      <div className="px-3 pt-2 pb-1 max-h-52 overflow-y-auto">
        {plan.tasks.map((task, idx) => (
          <PlanTaskRow
            key={task.id}
            task={task}
            accent={accent}
            isLast={idx === plan.tasks.length - 1}
          />
        ))}
      </div>
    </motion.div>
  );
}
