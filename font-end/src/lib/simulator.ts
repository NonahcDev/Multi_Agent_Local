import type { Agent, LogEntry, MetricHistory } from "@/types/agent";

const LOG_POOL = [
  "Received inference request from orchestrator",
  "Streaming token batch: 32 tokens",
  "Context window: {used}/{total} tokens",
  "KV cache hit rate: {rate}%",
  "Layer {n}/32 processing...",
  "Attention heads computed",
  "Sampling temperature: 0.7",
  "Tool call dispatched: search_web",
  "Agent handoff acknowledged — task {id}",
  "Throughput spike: {tps} tok/s",
  "Batch size auto-adjusted to {n}",
  "Memory defrag initiated",
  "VRAM pressure — swapping layers",
  "Task {id} completed in {ms}ms",
  "Mesh heartbeat sent",
  "Peer discovery: 6 agents online",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolateTemplate(tpl: string): string {
  return tpl
    .replace("{used}", String(Math.floor(Math.random() * 8000 + 2000)))
    .replace("{total}", "16384")
    .replace("{rate}", String(Math.floor(Math.random() * 40 + 55)))
    .replace("{n}", String(Math.floor(Math.random() * 30 + 2)))
    .replace("{id}", String(Math.floor(Math.random() * 900 + 100)))
    .replace("{tps}", String(Math.floor(Math.random() * 50 + 5)))
    .replace("{ms}", String(Math.floor(Math.random() * 900 + 80)));
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function drift(current: number, min: number, max: number, speed = 8): number {
  const delta = (Math.random() - 0.48) * speed;
  return clamp(current + delta, min, max);
}

export function tickAgent(agent: Agent): Agent {
  if (agent.isLive) return agent;
  if (agent.status === "error" || agent.status === "offline") {
    return { ...agent, lastSeen: agent.status === "error" ? agent.lastSeen : Date.now() };
  }

  const hw = agent.hardware;
  const newHardware = {
    ...hw,
    cpuUsage: drift(hw.cpuUsage, 5, 99, 10),
    gpuUsage: drift(hw.gpuUsage, agent.status === "idle" ? 2 : 30, 99, 8),
    ramUsed: clamp(hw.ramUsed + (Math.random() - 0.5) * 0.3, 0.5, hw.ramTotal),
    vramUsed: clamp(hw.vramUsed + (Math.random() - 0.5) * 0.2, 0, hw.vramTotal),
    temperature: drift(hw.temperature, 40, 95, 1),
    powerDraw: drift(hw.powerDraw, 30, 600, 15),
    networkIn: Math.max(0, hw.networkIn + (Math.random() - 0.4) * 0.5),
    networkOut: Math.max(0, hw.networkOut + (Math.random() - 0.4) * 0.5),
  };

  const newTPS = clamp(agent.model.tokensPerSec + (Math.random() - 0.5) * 4, 1, 80);

  const now = Date.now();
  const newHistoryPoint: MetricHistory = {
    time: now,
    cpu: newHardware.cpuUsage,
    gpu: newHardware.gpuUsage,
    tps: newTPS,
  };
  const newHistory = [...agent.history.slice(-29), newHistoryPoint];

  let newLogs = agent.logs;
  if (Math.random() < 0.4) {
    const d = new Date(now);
    const ts = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}.${d.getMilliseconds().toString().padStart(3,"0")}`;
    const levels: LogEntry["level"][] = ["info", "info", "info", "debug", "stream", "warn"];
    const newLog: LogEntry = {
      id: `${agent.id}-${now}`,
      timestamp: ts,
      level: levels[Math.floor(Math.random() * levels.length)],
      message: interpolateTemplate(randomFrom(LOG_POOL)),
      source: agent.hostname,
    };
    newLogs = [...agent.logs.slice(-49), newLog];
  }

  const updatedTasks = agent.tasks.map((task) => {
    if (task.status === "running") {
      const newProgress = Math.min(100, task.progress + Math.random() * 3);
      return { ...task, progress: newProgress, status: newProgress >= 100 ? ("done" as const) : task.status };
    }
    return task;
  });

  return {
    ...agent,
    hardware: newHardware,
    model: { ...agent.model, tokensPerSec: newTPS },
    logs: newLogs,
    tasks: updatedTasks,
    history: newHistory,
    lastSeen: now,
  };
}

export function computeSystemStats(agents: Agent[]) {
  const online = agents.filter((a) => a.status !== "offline" && a.status !== "error");
  const totalTPS = online.reduce((s, a) => s + a.model.tokensPerSec, 0);
  const avgTPS = online.length ? totalTPS / online.length : 0;
  const totalVRAMUsed = agents.reduce((s, a) => s + a.hardware.vramUsed, 0);
  const totalVRAMTotal = agents.reduce((s, a) => s + a.hardware.vramTotal, 0);
  const tasksQueued = agents.reduce((s, a) => s + a.tasks.filter((t) => t.status === "queued").length, 0);

  return {
    activeAgents: online.length,
    totalGPUs: agents.length,
    avgTPS: Math.round(avgTPS),
    totalVRAM: { used: totalVRAMUsed, total: totalVRAMTotal },
    tasksQueued,
    totalTasks: agents.reduce((s, a) => s + a.tasks.length, 0),
  };
}
