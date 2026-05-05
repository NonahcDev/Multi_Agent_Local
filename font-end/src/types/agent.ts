export type AgentStatus = "online" | "thinking" | "idle" | "error" | "offline";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface HardwareMetrics {
  cpuUsage: number;
  gpuUsage: number;
  ramUsed: number;
  ramTotal: number;
  vramUsed: number;
  vramTotal: number;
  temperature: number;
  powerDraw: number;
  networkIn: number;
  networkOut: number;
  hasGpu?: boolean;
}

export interface ModelInfo {
  name: string;
  quantization: string;
  tokensPerSec: number;
  contextSize: number;
  contextUsed: number;
  activeTask: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug" | "stream";
  message: string;
  source: string;
}

export interface TaskItem {
  id: string;
  description: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  createdAt: number;
}

export interface MetricHistory {
  time: number;
  cpu: number;
  gpu: number;
  tps: number;
}

export interface Agent {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  status: AgentStatus;
  role?: "global" | "worker";
  backend?: "ollama" | "n8n";
  hardware: HardwareMetrics;
  model: ModelInfo;
  logs: LogEntry[];
  tasks: TaskItem[];
  history: MetricHistory[];
  chat: ChatMessage[];
  lastSeen: number;
  uptime: number;
  connections: string[];
  isLive?: boolean;
}

export interface SystemStats {
  activeAgents: number;
  totalGPUs: number;
  avgTPS: number;
  totalVRAM: { used: number; total: number };
  tasksQueued: number;
  totalTasks: number;
}

// ── Structured Planning ────────────────────────────────────────────────────────

export type PlanTaskStatus = "pending" | "queued" | "running" | "done" | "failed";

export interface PlanTask {
  id: number;
  action: string;
  agent: string;
  description: string;
  input_from: number | null;
  depends_on: number | null;
  output: string | null;
  status: PlanTaskStatus;
  retry: number;
  max_retry: number;
  result: string | null;
  error: string | null;
}

export interface TaskPlan {
  id: string;
  goal: string;
  tasks: PlanTask[];
  created_at: number;
  status: PlanTaskStatus;
  iteration: number;
  max_iterations: number;
}

export interface ToolParam {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface ToolInfo {
  name: string;
  description: string;
  when_to_use: string;
  parameters: ToolParam[];
  success_rate: number;
}
