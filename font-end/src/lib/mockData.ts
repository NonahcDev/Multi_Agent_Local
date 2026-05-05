import type { Agent, LogEntry, MetricHistory } from "@/types/agent";

const TASK_DESCRIPTIONS = [
  "Analyzing customer support transcripts...",
  "Refactoring Python microservice...",
  "Generating product documentation draft...",
  "Summarizing research papers...",
  "Translating API documentation...",
  "Code review for PR #847...",
  "Generating unit test suite...",
  "Optimizing SQL query patterns...",
  "Extracting entities from corpus...",
  "Building RAG embeddings pipeline...",
  "Classifying support tickets...",
  "Writing marketing copy variants...",
];

const LOG_MESSAGES = [
  "Received task from orchestrator mesh",
  "Context loaded — 4096 tokens",
  "Streaming response at 28 tok/s",
  "Tool call: read_file('/data/corpus.txt')",
  "Iteration 3/10 complete",
  "Cache hit — reusing prior context",
  "Handoff request from Leviathan",
  "Inference step completed in 142ms",
  "Queue depth reduced to 2 tasks",
  "Model state checkpoint saved",
  "Agent-to-agent sync acknowledged",
  "VRAM usage stable at 82%",
  "Temperature throttle detected — reducing batch",
  "Task completed — notifying orchestrator",
];

// Fixed reference time — prevents server/client hydration mismatch from Date.now()
const MOCK_NOW = 1_700_000_000_000;

// Seeded PRNG (XorShift32) — prevents hydration mismatch from Math.random()
function xorshift32(seed: number): () => number {
  let s = (seed | 1) >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function nameToSeed(name: string): number {
  return name.split("").reduce((acc, c) => ((acc * 31 + c.charCodeAt(0)) >>> 0), 0x12345678);
}

function generateHistory(seed: number, length = 20): MetricHistory[] {
  const rand = xorshift32(seed ^ 0xA1B2C3D4);
  return Array.from({ length }, (_, i) => ({
    time: MOCK_NOW - (length - i) * 3000,
    cpu: 20 + rand() * 60,
    gpu: 30 + rand() * 65,
    tps: 10 + rand() * 45,
  }));
}

function generateLogs(agentName: string, count = 8): LogEntry[] {
  const rand = xorshift32(nameToSeed(agentName));
  const levels: LogEntry["level"][] = ["info", "info", "info", "debug", "stream", "warn"];
  return Array.from({ length: count }, (_, i) => {
    const baseMs = MOCK_NOW - (count - i) * 4500;
    const d = new Date(baseMs);
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const ss = String(d.getUTCSeconds()).padStart(2, "0");
    const ms = String(baseMs % 1000).padStart(3, "0");
    return {
      id: `${agentName}-log-${i}`,
      timestamp: `${hh}:${mm}:${ss}.${ms}`,
      level: levels[Math.floor(rand() * levels.length)],
      message: LOG_MESSAGES[Math.floor(rand() * LOG_MESSAGES.length)],
      source: agentName.toLowerCase().replace(/\s+/g, "_"),
    };
  });
}

export const INITIAL_AGENTS: Agent[] = [
  {
    id: "global",
    role: "global",
    name: "Global Agent",
    hostname: "localhost",
    ipAddress: "127.0.0.1",
    status: "offline",
    isLive: true,
    hardware: {
      cpuUsage: 0,
      gpuUsage: 0,
      ramUsed: 0,
      ramTotal: 0,
      vramUsed: 0,
      vramTotal: 0,
      temperature: 0,
      powerDraw: 0,
      networkIn: 0,
      networkOut: 0,
      hasGpu: false,
    },
    model: {
      name: "gpt-oss:20b",
      quantization: "GGUF",
      tokensPerSec: 0,
      contextSize: 128000,
      contextUsed: 0,
      activeTask: null,
    },
    logs: [],
    tasks: [],
    chat: [],
    history: [],
    lastSeen: 0,
    uptime: 0,
    connections: ["0", "1", "2", "3", "4", "5"],
  },
  {
    id: "0",
    name: "Leviathan",
    hostname: "levianthan-srv",
    ipAddress: "192.168.1.43",
    status: "offline",
    isLive: true,
    hardware: {
      cpuUsage: 0,
      gpuUsage: 0,
      ramUsed: 0,
      ramTotal: 0,
      vramUsed: 0,
      vramTotal: 0,
      temperature: 0,
      powerDraw: 0,
      networkIn: 0,
      networkOut: 0,
      hasGpu: false,
    },
    model: {
      name: "qwen2.5:1.5b",
      quantization: "GGUF",
      tokensPerSec: 0,
      contextSize: 4096,
      contextUsed: 0,
      activeTask: null,
    },
    logs: [],
    tasks: [],
    chat: [],
    history: [],
    lastSeen: 0,
    uptime: 0,
    connections: ["1", "3"],
  },
  {
    id: "1",
    name: "Leviathan",
    hostname: "gemini-2.5-flash",
    ipAddress: "192.168.1.43",
    status: "offline",
    isLive: true,
    backend: "n8n" as const,
    hardware: {
      cpuUsage: 0,
      gpuUsage: 0,
      ramUsed: 0,
      ramTotal: 0,
      vramUsed: 0,
      vramTotal: 0,
      temperature: 0,
      powerDraw: 0,
      networkIn: 0,
      networkOut: 0,
      hasGpu: false,
    },
    model: {
      name: "gemini-2.5-flash",
      quantization: "API",
      tokensPerSec: 0,
      contextSize: 0,
      contextUsed: 0,
      activeTask: null,
    },
    logs: [],
    tasks: [],
    chat: [],
    history: [],
    lastSeen: 0,
    uptime: 0,
    connections: ["0", "2"],
  },
  {
    id: "2",
    name: "Gamma Synthesizer",
    hostname: "gamma-node-1",
    ipAddress: "192.168.1.103",
    status: "online",
    hardware: {
      cpuUsage: 25,
      gpuUsage: 85,
      ramUsed: 48,
      ramTotal: 128,
      vramUsed: 38,
      vramTotal: 48,
      temperature: 79,
      powerDraw: 450,
      networkIn: 0.5,
      networkOut: 4.2,
    },
    model: {
      name: "mixtral-8x7b",
      quantization: "Q4_K_M",
      tokensPerSec: 35,
      contextSize: 32768,
      contextUsed: 8192,
      activeTask: TASK_DESCRIPTIONS[2],
    },
    logs: generateLogs("Gamma Synthesizer"),
    tasks: [
      { id: "t4", description: TASK_DESCRIPTIONS[2], status: "running", progress: 34, createdAt: MOCK_NOW - 45000 },
      { id: "t5", description: TASK_DESCRIPTIONS[7], status: "queued",  progress: 0,  createdAt: MOCK_NOW - 10000 },
      { id: "t6", description: TASK_DESCRIPTIONS[9], status: "queued",  progress: 0,  createdAt: MOCK_NOW - 5000 },
    ],
    chat: [],
    history: generateHistory(nameToSeed("Gamma Synthesizer")),
    lastSeen: MOCK_NOW,
    uptime: 72 * 3600,
    connections: ["1", "3"],
  },
  {
    id: "3",
    name: "Delta Researcher",
    hostname: "delta-pc",
    ipAddress: "192.168.1.104",
    status: "idle",
    hardware: {
      cpuUsage: 10,
      gpuUsage: 20,
      ramUsed: 3.5,
      ramTotal: 16,
      vramUsed: 3.5,
      vramTotal: 6,
      temperature: 55,
      powerDraw: 85,
      networkIn: 0.1,
      networkOut: 0.1,
    },
    model: {
      name: "phi3-mini",
      quantization: "Q8_0",
      tokensPerSec: 52,
      contextSize: 4096,
      contextUsed: 0,
      activeTask: null,
    },
    logs: generateLogs("Delta Researcher"),
    tasks: [],
    chat: [],
    history: generateHistory(nameToSeed("Delta Researcher")),
    lastSeen: MOCK_NOW,
    uptime: 6 * 3600,
    connections: ["0", "2"],
  },
  {
    id: "4",
    name: "Epsilon Vision",
    hostname: "epsilon-gpu-rig",
    ipAddress: "192.168.1.105",
    status: "thinking",
    hardware: {
      cpuUsage: 55,
      gpuUsage: 98,
      ramUsed: 32,
      ramTotal: 64,
      vramUsed: 23.8,
      vramTotal: 24,
      temperature: 91,
      powerDraw: 520,
      networkIn: 2.8,
      networkOut: 1.6,
    },
    model: {
      name: "qwen2.5-72b",
      quantization: "Q3_K_L",
      tokensPerSec: 12,
      contextSize: 131072,
      contextUsed: 65536,
      activeTask: TASK_DESCRIPTIONS[8],
    },
    logs: generateLogs("Epsilon Vision"),
    tasks: [
      { id: "t7", description: TASK_DESCRIPTIONS[8],  status: "running", progress: 71, createdAt: MOCK_NOW - 200000 },
      { id: "t8", description: TASK_DESCRIPTIONS[11], status: "queued",  progress: 0,  createdAt: MOCK_NOW - 15000 },
    ],
    chat: [],
    history: generateHistory(nameToSeed("Epsilon Vision")),
    lastSeen: MOCK_NOW,
    uptime: 96 * 3600,
    connections: ["1", "5"],
  },
  {
    id: "5",
    name: "Zeta Analyst",
    hostname: "zeta-server",
    ipAddress: "192.168.1.106",
    status: "error",
    hardware: {
      cpuUsage: 5,
      gpuUsage: 0,
      ramUsed: 2.1,
      ramTotal: 32,
      vramUsed: 0,
      vramTotal: 16,
      temperature: 48,
      powerDraw: 45,
      networkIn: 0,
      networkOut: 0,
    },
    model: {
      name: "deepseek-r1-14b",
      quantization: "Q4_K_M",
      tokensPerSec: 0,
      contextSize: 65536,
      contextUsed: 0,
      activeTask: null,
    },
    logs: [
      {
        id: "zeta-err-1",
        timestamp: "00:00:00.000",
        level: "error",
        message: "CUDA out of memory — model unloaded",
        source: "zeta_analyst",
      },
      {
        id: "zeta-err-2",
        timestamp: "00:00:00.000",
        level: "error",
        message: "Ollama process terminated unexpectedly",
        source: "zeta_analyst",
      },
      ...generateLogs("Zeta Analyst", 4),
    ],
    tasks: [],
    chat: [],
    history: generateHistory(nameToSeed("Zeta Analyst")),
    lastSeen: MOCK_NOW - 120000,
    uptime: 2 * 3600,
    connections: ["4"],
  },
];
