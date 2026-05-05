"use client";

import { X, Thermometer, Zap, Network } from "lucide-react";
import { GlowProgress } from "@/components/ui/GlowProgress";
import { CircularGauge } from "@/components/ui/CircularGauge";
import { MiniSparkline } from "@/components/ui/MiniSparkline";
import { formatBytes, getUsageColor } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import type { HardwareMetrics, MetricHistory } from "@/types/agent";

interface HardwareMonitorProps {
  hardware: HardwareMetrics;
  history: MetricHistory[];
}

interface NoGpuGaugeProps {
  label: string;
  size?: number;
  pink: string;
}

function NoGpuGauge({ label, size = 52, pink }: NoGpuGaugeProps) {
  const radius = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div className="flex flex-col items-center gap-1" style={{ opacity: 0.6 }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={4}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <X className="w-4 h-4" style={{ color: pink }} strokeWidth={2.5} />
        </div>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
        {label}
      </span>
    </div>
  );
}

export function HardwareMonitor({ hardware, history }: HardwareMonitorProps) {
  const { isDark } = useTheme();
  const cpuPct  = hardware.cpuUsage;
  const gpuPct  = hardware.gpuUsage;
  const ramPct  = hardware.ramTotal > 0 ? (hardware.ramUsed  / hardware.ramTotal)  * 100 : 0;
  const vramPct = hardware.vramTotal > 0 ? (hardware.vramUsed / hardware.vramTotal) * 100 : 0;

  const blue  = isDark ? "#7CC7E8" : "#98D7F2";
  const green = isDark ? "#9FDCC4" : "#BFE8D2";
  const pink  = isDark ? "#F2A7B5" : "#FDBDC9";

  const noGpu = hardware.hasGpu === false;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 justify-between">
        <CircularGauge value={cpuPct}  label="CPU"  size={52} color={getUsageColor(cpuPct, isDark)} />
        {noGpu
          ? <NoGpuGauge label="GPU" size={52} pink={pink} />
          : <CircularGauge value={gpuPct} label="GPU" size={52} color={getUsageColor(gpuPct, isDark)} />
        }
        <CircularGauge value={ramPct}  label="RAM"  size={52} color={green} />
        {noGpu
          ? <NoGpuGauge label="VRAM" size={52} pink={pink} />
          : <CircularGauge value={vramPct} label="VRAM" size={52} color={getUsageColor(vramPct, isDark)} />
        }
      </div>

      <div className="space-y-1.5">
        <GlowProgress
          value={hardware.ramUsed}
          max={hardware.ramTotal > 0 ? hardware.ramTotal : 1}
          label={`RAM ${formatBytes(hardware.ramUsed)}/${formatBytes(hardware.ramTotal)}`}
          height={3}
          color={green}
        />
        {!noGpu && (
          <GlowProgress
            value={hardware.vramUsed}
            max={hardware.vramTotal}
            label={`VRAM ${formatBytes(hardware.vramUsed)}/${formatBytes(hardware.vramTotal)}`}
            height={3}
            color={getUsageColor(vramPct, isDark)}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5" style={{ color: pink }}>
          <Thermometer className="w-3 h-3" />
          <span>{hardware.temperature > 0 ? `${hardware.temperature.toFixed(0)}°C` : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: green }}>
          <Zap className="w-3 h-3" />
          <span>{hardware.powerDraw > 0 ? `${hardware.powerDraw.toFixed(0)}W` : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: blue }}>
          <Network className="w-3 h-3" />
          <span>{hardware.networkIn.toFixed(2)}MB/s</span>
        </div>
      </div>

      <div className="h-[36px]">
        <MiniSparkline data={history} dataKey={noGpu ? "cpu" : "gpu"} color={noGpu ? blue : pink} height={36} />
      </div>
    </div>
  );
}
