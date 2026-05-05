"use client";

import { create } from "zustand";
import type { Agent, ChatMessage, HardwareMetrics, LogEntry, ModelInfo, SystemStats, TaskItem, TaskPlan, PlanTask, ToolInfo } from "@/types/agent";
import { INITIAL_AGENTS } from "@/lib/mockData";
import { tickAgent, computeSystemStats } from "@/lib/simulator";
import type { WsStatus } from "@/hooks/useBackendWS";

export interface AgentPatch {
  status?: Agent["status"];
  hardware?: Partial<HardwareMetrics>;
  model?: Partial<ModelInfo>;
  hostname?: string;
  uptime?: number;
  lastSeen?: number;
}

interface AgentStore {
  agents: Agent[];
  stats: SystemStats;
  selectedAgentId: string | null;
  sidebarOpen: boolean;
  wsStatus: WsStatus;
  isBackendConnected: boolean;

  // Structured planning
  currentPlan: TaskPlan | null;
  toolRegistry: ToolInfo[];
  setPlan: (plan: TaskPlan) => void;
  updatePlanTask: (planId: string, task: PlanTask) => void;
  clearPlan: () => void;
  setToolRegistry: (tools: ToolInfo[]) => void;

  // Simulation tick (used only when backend is offline)
  tickAll: () => void;

  // Backend data ingestion
  setAgentsFromBackend: (raw: unknown[]) => void;
  setWsStatus: (status: WsStatus) => void;

  // Live server patch (real data from polling)
  patchAgent: (id: string, patch: AgentPatch) => void;

  // Task management
  addTask: (agentId: string, task: TaskItem) => void;
  updateTask: (agentId: string, taskId: string, patch: Partial<TaskItem>) => void;
  appendLog: (agentId: string, log: LogEntry) => void;

  // Chat
  appendChatMessage: (agentId: string, msg: ChatMessage) => void;
  appendChatToken: (agentId: string, msgId: string, token: string) => void;
  finishChatMessage: (agentId: string, msgId: string) => void;

  selectAgent: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * Convert the snake_case backend payload to the camelCase frontend type.
 * The backend uses Python naming; we normalise here so the rest of the
 * frontend stays unchanged.
 */
function normaliseAgent(raw: Record<string, unknown>): Agent {
  const hw = (raw.hardware ?? {}) as Record<string, unknown>;
  const model = (raw.model ?? {}) as Record<string, unknown>;

  return {
    id: String(raw.id ?? raw.agent_id ?? ""),
    name: String(raw.name ?? "Unknown"),
    hostname: String(raw.hostname ?? ""),
    ipAddress: String(raw.ip_address ?? ""),
    status: (raw.status as Agent["status"]) ?? "offline",
    hardware: {
      cpuUsage: Number(hw.cpu_usage ?? 0),
      gpuUsage: Number(hw.gpu_usage ?? 0),
      ramUsed: Number(hw.ram_used ?? 0),
      ramTotal: Number(hw.ram_total ?? 0),
      vramUsed: Number(hw.vram_used ?? 0),
      vramTotal: Number(hw.vram_total ?? 0),
      temperature: Number(hw.temperature ?? 0),
      powerDraw: Number(hw.power_draw ?? 0),
      networkIn: Number(hw.network_in ?? 0),
      networkOut: Number(hw.network_out ?? 0),
    },
    model: {
      name: String(model.name ?? "unknown"),
      quantization: String(model.quantization ?? "Q4_K_M"),
      tokensPerSec: Number(model.tokens_per_sec ?? 0),
      contextSize: Number(model.context_size ?? 4096),
      contextUsed: Number(model.context_used ?? 0),
      activeTask: (model.active_task as string | null) ?? null,
    },
    logs: [],          // logs arrive separately via broadcast
    tasks: [],
    chat: [],
    history: [],
    lastSeen: Number(raw.last_seen ?? Date.now() / 1000) * 1000,
    uptime: Number(raw.uptime ?? 0),
    connections: (raw.connections as string[]) ?? [],
  };
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: INITIAL_AGENTS,
  stats: computeSystemStats(INITIAL_AGENTS),
  selectedAgentId: null,
  sidebarOpen: true,
  wsStatus: "disconnected",
  isBackendConnected: false,

  // Plan state
  currentPlan: null,
  toolRegistry: [],

  setPlan: (plan) => set({ currentPlan: plan }),

  updatePlanTask: (planId, task) =>
    set((state) => {
      if (!state.currentPlan || state.currentPlan.id !== planId) return state;
      return {
        currentPlan: {
          ...state.currentPlan,
          tasks: state.currentPlan.tasks.map((t) =>
            t.id === task.id ? { ...t, ...task } : t
          ),
        },
      };
    }),

  clearPlan: () => set({ currentPlan: null }),

  setToolRegistry: (tools) => set({ toolRegistry: tools }),

  tickAll: () =>
    set((state) => {
      // Only simulate when not receiving real data
      if (state.isBackendConnected) return state;
      const agents = state.agents.map(tickAgent);
      return { agents, stats: computeSystemStats(agents) };
    }),

  setAgentsFromBackend: (raw) => {
    const incoming = raw as Record<string, unknown>[];
    const normalised = incoming.map(normaliseAgent);

    set((state) => {
      const backendMap = new Map(normalised.map((a) => [a.id, a]));

      // Update existing agents with backend data — never drop agents not in payload
      const merged = state.agents.map((existing) => {
        const newAgent = backendMap.get(existing.id);
        if (!newAgent) return existing;
        const point = {
          time: Date.now(),
          cpu: newAgent.hardware.cpuUsage,
          gpu: newAgent.hardware.gpuUsage,
          tps: newAgent.model.tokensPerSec,
        };
        return {
          ...existing,
          ...newAgent,
          role: existing.role,   // preserve role so global card stays visible
          history: [...existing.history.slice(-29), point],
          logs: existing.logs,
        };
      });

      // Append genuinely new agents sent by backend
      const existingIds = new Set(state.agents.map((a) => a.id));
      for (const newAgent of normalised) {
        if (!existingIds.has(newAgent.id)) merged.push(newAgent);
      }

      return { agents: merged, stats: computeSystemStats(merged) };
    });
  },

  setWsStatus: (status) =>
    set({ wsStatus: status, isBackendConnected: status === "connected" }),

  patchAgent: (id, patch) =>
    set((state) => {
      const agents = state.agents.map((agent) => {
        if (agent.id !== id) return agent;
        const newHistory = patch.hardware
          ? [
              ...agent.history.slice(-29),
              {
                time: Date.now(),
                cpu: patch.hardware.cpuUsage ?? agent.hardware.cpuUsage,
                gpu: patch.hardware.gpuUsage ?? agent.hardware.gpuUsage,
                tps: agent.model.tokensPerSec,
              },
            ]
          : agent.history;
        return {
          ...agent,
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.hostname !== undefined && { hostname: patch.hostname }),
          ...(patch.uptime !== undefined && { uptime: patch.uptime }),
          ...(patch.lastSeen !== undefined && { lastSeen: patch.lastSeen }),
          hardware: patch.hardware
            ? { ...agent.hardware, ...patch.hardware }
            : agent.hardware,
          model: patch.model
            ? { ...agent.model, ...patch.model }
            : agent.model,
          history: newHistory,
        };
      });
      return { agents, stats: computeSystemStats(agents) };
    }),

  addTask: (agentId, task) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id !== agentId ? a : { ...a, tasks: [...a.tasks, task] }
      ),
    })),

  updateTask: (agentId, taskId, patch) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id !== agentId ? a : {
          ...a,
          tasks: a.tasks.map((t) => t.id !== taskId ? t : { ...t, ...patch }),
        }
      ),
    })),

  appendLog: (agentId, log) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id !== agentId ? a : { ...a, logs: [...a.logs.slice(-49), log] }
      ),
    })),

  appendChatMessage: (agentId, msg) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id !== agentId ? a : { ...a, chat: [...a.chat, msg] }
      ),
    })),

  appendChatToken: (agentId, msgId, token) =>
    set((state) => ({
      agents: state.agents.map((a) => {
        if (a.id !== agentId) return a;
        return {
          ...a,
          chat: a.chat.map((m) =>
            m.id !== msgId ? m : { ...m, content: m.content + token }
          ),
        };
      }),
    })),

  finishChatMessage: (agentId, msgId) =>
    set((state) => ({
      agents: state.agents.map((a) => {
        if (a.id !== agentId) return a;
        return {
          ...a,
          chat: a.chat.map((m) =>
            m.id !== msgId ? m : { ...m, isStreaming: false }
          ),
        };
      }),
    })),

  selectAgent: (id) => set({ selectedAgentId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
