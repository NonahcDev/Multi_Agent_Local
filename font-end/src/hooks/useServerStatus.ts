"use client";

import { useEffect, useRef, useCallback } from "react";
import serversConfig from "@/config/servers.json";
import { useAgentStore } from "@/store/agentStore";

interface StatusApiResponse {
  cpu_percent: string | number;
  disk_usage: string;
  load_avg: string;
  network: { rx_kb_s: number; tx_kb_s: number };
  ram_percent: string | number;
  ram_total_mb: string | number;
  ram_used_mb: string | number;
  uptime: string | number;
}

interface OllamaModel {
  name: string;
  details?: {
    quantization_level?: string;
    parameter_size?: string;
  };
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

function parseNum(val: string | number | undefined | null, fallback = 0): number {
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const n = parseFloat(String(val));
  return isNaN(n) ? fallback : n;
}

function isErrorStr(val: unknown): boolean {
  return typeof val === "string" && (val.includes("not found") || val.includes("/bin/sh"));
}

const POLL_INTERVAL_MS = 3000;
const FETCH_TIMEOUT_MS = 4000;

export function useServerStatus() {
  const patchAgent = useAgentStore((s) => s.patchAgent);
  const modelsLoadedRef = useRef<Set<string>>(new Set());

  const fetchStatus = useCallback(async () => {
    for (const server of serversConfig.servers) {
      // Global agent: check Ollama health instead of status server
      if ((server as { role?: string }).role === "global") {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
          const res = await fetch(`/api/node/${server.id}/ollama/api/tags`, { signal: ctrl.signal });
          clearTimeout(tid);
          patchAgent(server.id, { status: res.ok ? "online" : "offline", lastSeen: Date.now() });
        } catch {
          patchAgent(server.id, { status: "offline", lastSeen: Date.now() });
        }
        continue;
      }

      try {
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const res = await fetch(
          `/api/node/${server.id}/status`,
          { signal: controller.signal }
        );
        clearTimeout(timerId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: StatusApiResponse = await res.json();

        // CPU: prefer cpu_percent; fall back to load_avg / 4 cores estimate
        let cpuUsage = isErrorStr(data.cpu_percent) ? 0 : parseNum(data.cpu_percent);
        if (cpuUsage === 0 && data.load_avg && !isErrorStr(data.load_avg)) {
          const load1 = parseNum(data.load_avg.split(" ")[0]);
          cpuUsage = Math.min(100, load1 * 25);
        }

        const ramUsedMb  = isErrorStr(data.ram_used_mb)  ? 0 : parseNum(data.ram_used_mb);
        const ramTotalMb = isErrorStr(data.ram_total_mb) ? 0 : parseNum(data.ram_total_mb);

        const netIn  = (data.network?.rx_kb_s ?? 0) / 1024;
        const netOut = (data.network?.tx_kb_s ?? 0) / 1024;

        const uptimeSec = isErrorStr(data.uptime) ? undefined : parseNum(data.uptime);

        patchAgent(server.id, {
          status: "online",
          hardware: {
            cpuUsage,
            gpuUsage: 0,
            ramUsed:  ramUsedMb  / 1024,
            ramTotal: ramTotalMb > 0 ? ramTotalMb / 1024 : 0,
            vramUsed:  0,
            vramTotal: 0,
            temperature: 0,
            powerDraw:   0,
            networkIn:  netIn,
            networkOut: netOut,
            hasGpu: server.hasGpu,
          },
          ...(uptimeSec !== undefined && { uptime: uptimeSec }),
          lastSeen: Date.now(),
        });
      } catch {
        patchAgent(server.id, { status: "offline", lastSeen: Date.now() });
      }
    }
  }, [patchAgent]);

  const fetchModels = useCallback(async () => {
    for (const server of serversConfig.servers) {
      if (modelsLoadedRef.current.has(server.id)) continue;
      if ((server as { backend?: string }).backend === "n8n") continue;
      if ((server as { role?: string }).role === "global") continue;

      try {
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const res = await fetch(
          `http://${server.ipAddress}:${server.ollamaPort}/api/tags`,
          { signal: controller.signal }
        );
        clearTimeout(timerId);

        if (!res.ok) continue;

        const data: OllamaTagsResponse = await res.json();
        const first = data.models?.[0];
        if (!first) continue;

        patchAgent(server.id, {
          hostname: first.name,
          model: {
            name:         first.name,
            quantization: first.details?.quantization_level ?? "GGUF",
            tokensPerSec: 0,
            contextSize:  4096,
            contextUsed:  0,
            activeTask:   null,
          },
        });

        modelsLoadedRef.current.add(server.id);
      } catch {
        // Ollama unreachable — keep defaults, will retry next cycle
      }
    }
  }, [patchAgent]);

  useEffect(() => {
    fetchStatus();
    fetchModels();

    const interval = setInterval(() => {
      fetchStatus();
      // Retry Ollama model fetch if not yet loaded
      fetchModels();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchModels]);
}
