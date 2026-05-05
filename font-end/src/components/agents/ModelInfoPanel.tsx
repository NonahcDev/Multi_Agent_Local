"use client";

import { motion } from "framer-motion";
import { Cpu, Layers, Activity, BookOpen } from "lucide-react";
import { GlowProgress } from "@/components/ui/GlowProgress";
import { MiniSparkline } from "@/components/ui/MiniSparkline";
import { useTheme } from "@/context/ThemeContext";
import type { ModelInfo, MetricHistory } from "@/types/agent";

interface ModelInfoPanelProps {
  model: ModelInfo;
  history: MetricHistory[];
}

export function ModelInfoPanel({ model, history }: ModelInfoPanelProps) {
  const { isDark } = useTheme();
  const blue  = isDark ? "#7CC7E8" : "#98D7F2";
  const green = isDark ? "#9FDCC4" : "#BFE8D2";
  const pink  = isDark ? "#F2A7B5" : "#FDBDC9";

  const ctxPct = (model.contextUsed / model.contextSize) * 100;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2 border"
          style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Cpu className="w-3 h-3" style={{ color: blue }} />
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Model</span>
          </div>
          <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-1)" }}>{model.name}</span>
        </div>
        <div
          className="rounded-lg p-2 border"
          style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="w-3 h-3" style={{ color: pink }} />
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Quant</span>
          </div>
          <span className="text-sm font-mono font-semibold" style={{ color: pink }}>{model.quantization}</span>
        </div>
      </div>

      <div
        className="flex items-center justify-between rounded-lg p-2 border"
        style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" style={{ color: green }} />
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Throughput</span>
        </div>
        <motion.span
          key={model.tokensPerSec}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-mono font-bold"
          style={{ color: green }}
        >
          {model.tokensPerSec.toFixed(0)}
          <span className="text-[10px] ml-1" style={{ color: "var(--text-2)" }}>tok/s</span>
        </motion.span>
      </div>

      <div className="space-y-1">
        <GlowProgress
          value={ctxPct}
          label={`Context ${(model.contextUsed / 1000).toFixed(0)}K/${(model.contextSize / 1000).toFixed(0)}K`}
          height={3}
          color={blue}
        />
      </div>

      {model.activeTask && (
        <div
          className="rounded-lg p-2 border"
          style={{ backgroundColor: `${pink}08`, borderColor: `${pink}25` }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen className="w-3 h-3" style={{ color: pink }} />
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: pink }}>Active Task</span>
          </div>
          <p className="text-xs font-mono truncate" style={{ color: "var(--text-1)" }}>{model.activeTask}</p>
        </div>
      )}

      <div className="h-[30px]">
        <MiniSparkline data={history} dataKey="tps" color={green} height={30} />
      </div>
    </div>
  );
}
