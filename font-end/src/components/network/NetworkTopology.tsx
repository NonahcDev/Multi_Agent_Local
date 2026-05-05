"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getStatusColor } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import type { Agent } from "@/types/agent";

interface NodePosition { x: number; y: number; }

interface Packet {
  id: string;
  from: string;
  to: string;
  progress: number;
  color: string;
}

interface NetworkTopologyProps {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  width: number;
  height: number;
}

function computePositions(agents: Agent[], w: number, h: number): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};
  const count = agents.length;
  const cx = w / 2, cy = h / 2;
  const rx = w * 0.36, ry = h * 0.36;

  agents.forEach((agent, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    positions[agent.id] = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });
  return positions;
}

export function NetworkTopology({ agents, selectedId, onSelect, width, height }: NetworkTopologyProps) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const { isDark } = useTheme();
  const positions = computePositions(agents, width, height);

  useEffect(() => {
    const interval = setInterval(() => {
      const activeAgents = agents.filter((a) => a.status !== "offline" && a.status !== "error");
      if (activeAgents.length < 2) return;

      const from = activeAgents[Math.floor(Math.random() * activeAgents.length)];
      const targets = from.connections.filter((c) => positions[c]);
      if (!targets.length) return;
      const toId = targets[Math.floor(Math.random() * targets.length)];
      const toAgent = agents.find((a) => a.id === toId);
      if (!toAgent) return;

      const pkt: Packet = {
        id: `pkt-${Date.now()}`,
        from: from.id,
        to: toId,
        progress: 0,
        color: getStatusColor(from.status, isDark),
      };
      setPackets((p) => [...p.slice(-8), pkt]);
      setTimeout(() => setPackets((p) => p.filter((x) => x.id !== pkt.id)), 1800);
    }, 1400);

    return () => clearInterval(interval);
  }, [agents, positions, isDark]);

  const connections: Array<{ from: string; to: string }> = [];
  const seen = new Set<string>();
  agents.forEach((agent) => {
    agent.connections.forEach((targetId) => {
      const key = [agent.id, targetId].sort().join("-");
      if (!seen.has(key) && positions[targetId]) {
        seen.add(key);
        connections.push({ from: agent.id, to: targetId });
      }
    });
  });

  const connectionLineColor = isDark ? "rgba(124,199,232,0.15)" : "rgba(152,215,242,0.40)";

  return (
    <div
      className="relative rounded-xl border overflow-hidden"
      style={{
        width,
        height,
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      {/* grid bg */}
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid pointer-events-none"
        style={{ opacity: isDark ? 0.12 : 0.3 }}
      />

      <svg width={width} height={height} className="absolute inset-0">
        {/* connection lines */}
        {connections.map(({ from, to }) => {
          const fp = positions[from], tp = positions[to];
          if (!fp || !tp) return null;
          return (
            <line
              key={`${from}-${to}`}
              x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
              stroke={connectionLineColor}
              strokeWidth={1}
              strokeDasharray="4 6"
            />
          );
        })}

        {/* data packets */}
        {packets.map((pkt) => {
          const fp = positions[pkt.from], tp = positions[pkt.to];
          if (!fp || !tp) return null;
          return (
            <motion.circle
              key={pkt.id}
              r={3}
              fill={pkt.color}
              initial={{ cx: fp.x, cy: fp.y, opacity: 0.8 }}
              animate={{ cx: tp.x, cy: tp.y, opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            />
          );
        })}
      </svg>

      {/* nodes */}
      {agents.map((agent) => {
        const pos = positions[agent.id];
        if (!pos) return null;
        const color = getStatusColor(agent.status, isDark);
        const isSelected = selectedId === agent.id;
        const NODE_R = isSelected ? 28 : 24;

        return (
          <motion.div
            key={agent.id}
            className="absolute flex flex-col items-center cursor-pointer"
            style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
            whileHover={{ scale: 1.1 }}
            onClick={() => onSelect(agent.id)}
          >
            {/* soft glow ring */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: NODE_R * 2.8,
                height: NODE_R * 2.8,
                background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* ring */}
            <motion.div
              className="rounded-full border-2 flex items-center justify-center"
              style={{
                width: NODE_R * 2,
                height: NODE_R * 2,
                borderColor: color,
                backgroundColor: `${color}15`,
                boxShadow: isSelected
                  ? `0 0 0 2px ${color}40`
                  : `0 2px 8px var(--shadow)`,
              }}
              animate={isSelected ? { borderColor: [color, `${color}99`, color] } : {}}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <span
                className="text-[9px] font-mono font-bold text-center leading-tight px-1"
                style={{ color: "var(--text-1)" }}
              >
                {agent.name.split(" ")[0]}
              </span>
            </motion.div>
            <span className="mt-1.5 text-[9px] font-mono whitespace-nowrap" style={{ color: "var(--text-2)" }}>
              {agent.model.name}
            </span>
            <span className="text-[8px] font-mono" style={{ color }}>
              {agent.model.tokensPerSec.toFixed(0)} t/s
            </span>
          </motion.div>
        );
      })}

      {/* center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="text-[10px] font-mono uppercase tracking-[0.3em]"
          style={{ color: "var(--text-2)", opacity: 0.5 }}
        >
          mesh network
        </div>
      </div>
    </div>
  );
}
