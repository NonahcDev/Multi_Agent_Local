"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/agentStore";
import { useSimulator } from "@/hooks/useSimulator";
import { useBackendWS } from "@/hooks/useBackendWS";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useTheme } from "@/context/ThemeContext";
import { Sidebar, type AppTab } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AgentCard } from "@/components/agents/AgentCard";
import { GlobalAgentCard } from "@/components/agents/GlobalAgentCard";
import { AssignTaskModal } from "@/components/agents/AssignTaskModal";
import { N8nChatModal } from "@/components/agents/N8nChatModal";
import { NetworkTopology } from "@/components/network/NetworkTopology";
import { PresetsView } from "@/components/views/PresetsView";
import { DatabaseView } from "@/components/views/DatabaseView";
import { Plus, Network, LayoutGrid } from "lucide-react";
import serversConfig from "@/config/servers.json";

type ViewMode = "grid" | "network";

const PLACEHOLDER_TABS: AppTab[] = ["workflows", "models", "hardware", "network", "logs", "settings"];

function timestamp(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

export default function AppShell() {
  useBackendWS();
  useSimulator(1200);
  useServerStatus();

  const allAgents       = useAgentStore((s) => s.agents);
  const stats           = useAgentStore((s) => s.stats);
  const wsStatus        = useAgentStore((s) => s.wsStatus);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const selectAgent     = useAgentStore((s) => s.selectAgent);

  const globalAgent = allAgents.find((a) => a.role === "global") ?? null;
  const agents      = allAgents.filter((a) => a.role !== "global");

  const [activeTab, setActiveTab]       = useState<AppTab>("dashboard");
  const [viewMode, setViewMode]         = useState<ViewMode>("grid");
  const [modalAgentId, setModalAgentId] = useState<string | null>(null);
  const { isDark } = useTheme();

  const accentBlue = isDark ? "#7CC7E8" : "#98D7F2";
  const modalAgent = modalAgentId ? agents.find((a) => a.id === modalAgentId) ?? null : null;

  const handleRunTask = useCallback(async (agentId: string, prompt: string) => {
    const store = useAgentStore.getState();
    const agent = store.agents.find((a) => a.id === agentId);
    if (!agent) return;

    const taskId      = `t-${Date.now()}`;
    const description = prompt.length > 55 ? prompt.slice(0, 52) + "..." : prompt;

    store.addTask(agentId, {
      id: taskId, description,
      status: "running", progress: 0,
      createdAt: Date.now(),
    });

    store.appendLog(agentId, {
      id: `${taskId}-start`,
      timestamp: timestamp(),
      level: "info",
      message: `Task assigned: ${description}`,
      source: agentId,
    });

    if (!agent.isLive) return;

    const server = serversConfig.servers.find((s) => s.id === agentId);
    if (!server) return;

    store.patchAgent(agentId, { status: "thinking" });

    if ((server as { backend?: string }).backend === "n8n") {
      const webhookUrl = (server as { n8nWebhookUrl?: string }).n8nWebhookUrl;
      if (!webhookUrl) return;
      try {
        const session_id = `${agentId}-session`;
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt, session_id }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const output: string =
          Array.isArray(data)
            ? (data[0]?.output ?? data[0]?.text ?? JSON.stringify(data[0]))
            : (data.output ?? data.text ?? data.message ?? JSON.stringify(data));
        if (output.trim()) {
          useAgentStore.getState().appendLog(agentId, {
            id: `${taskId}-response`,
            timestamp: timestamp(),
            level: "stream",
            message: output.trim(),
            source: "n8n",
          });
        }
        useAgentStore.getState().updateTask(agentId, taskId, { status: "done", progress: 100 });
        useAgentStore.getState().patchAgent(agentId, { status: "online" });
        useAgentStore.getState().appendLog(agentId, {
          id: `${taskId}-done`,
          timestamp: timestamp(),
          level: "info",
          message: "Completed via n8n webhook",
          source: "n8n",
        });
      } catch (e) {
        useAgentStore.getState().updateTask(agentId, taskId, { status: "failed", progress: 0 });
        useAgentStore.getState().patchAgent(agentId, { status: "online" });
        useAgentStore.getState().appendLog(agentId, {
          id: `${taskId}-err`,
          timestamp: timestamp(),
          level: "error",
          message: `n8n webhook failed: ${String(e)}`,
          source: "n8n",
        });
      }
      return;
    }

    try {
      const res = await fetch(
        `/api/node/${server.id}/ollama/api/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: agent.model.name, prompt, stream: true }),
        }
      );
      if (!res.body) throw new Error("No stream body");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer   = "";
      let fullResponse = "";
      let tokenCount   = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text  = decoder.decode(value, { stream: true });
        const lines = (lineBuffer + text).split("\n");
        lineBuffer  = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) { fullResponse += json.response; tokenCount++; }
            if (json.done) {
              if (fullResponse.trim()) {
                useAgentStore.getState().appendLog(agentId, {
                  id: `${taskId}-response`,
                  timestamp: timestamp(),
                  level: "stream",
                  message: fullResponse.trim(),
                  source: "ollama",
                });
              }
              useAgentStore.getState().updateTask(agentId, taskId, { status: "done", progress: 100 });
              useAgentStore.getState().patchAgent(agentId, { status: "online" });
              useAgentStore.getState().appendLog(agentId, {
                id: `${taskId}-done`,
                timestamp: timestamp(),
                level: "info",
                message: `Completed — ${tokenCount} tokens`,
                source: "ollama",
              });
            }
          } catch { /* malformed JSON line */ }
        }
      }
    } catch (e) {
      useAgentStore.getState().updateTask(agentId, taskId, { status: "failed", progress: 0 });
      useAgentStore.getState().patchAgent(agentId, { status: "online" });
      useAgentStore.getState().appendLog(agentId, {
        id: `${taskId}-err`,
        timestamp: timestamp(),
        level: "error",
        message: `Task failed: ${String(e)}`,
        source: "ollama",
      });
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* grid background — always visible for consistent feel */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 bg-grid-pattern bg-grid"
          style={{ opacity: isDark ? 0.12 : 0.25 }}
        />
      </div>

      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        {/* TopBar always visible — keeps layout consistent across all tabs */}
        <TopBar stats={stats} wsStatus={wsStatus} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="flex-1 min-w-0 overflow-hidden flex flex-col"
          >
            {/* ── Dashboard ── */}
            {activeTab === "dashboard" && (
              <main className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <h1 className="text-lg font-mono font-bold tracking-wide" style={{ color: "var(--text-1)" }}>
                    Dashboard
                  </h1>
                  <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-2)" }}>
                    {stats.activeAgents} active · {allAgents.length} total · mesh v1.0
                  </p>
                </div>

                {globalAgent ? (
                  <GlobalAgentCard
                    agent={globalAgent}
                    workerAgents={agents}
                    onRunTask={(prompt) => handleRunTask(globalAgent.id, prompt)}
                    isSelected={selectedAgentId === globalAgent.id}
                    onSelect={() => selectAgent(selectedAgentId === globalAgent.id ? null : globalAgent.id)}
                  />
                ) : (
                  <div
                    className="flex flex-col items-center justify-center py-20 rounded-xl border"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
                  >
                    <p className="text-sm font-mono" style={{ color: "var(--text-2)" }}>No global agent connected</p>
                  </div>
                )}
              </main>
            )}

            {/* ── Agents Cluster ── */}
            {activeTab === "agents" && (
              <main className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-mono font-bold tracking-wide" style={{ color: "var(--text-1)" }}>
                      Agents Cluster
                    </h1>
                    <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-2)" }}>
                      {stats.activeAgents} active · {agents.length} total · mesh v1.0
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="flex rounded-lg border p-0.5"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
                    >
                      <button
                        onClick={() => setViewMode("grid")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all"
                        style={{
                          backgroundColor: viewMode === "grid" ? `${accentBlue}20` : "transparent",
                          color: viewMode === "grid" ? accentBlue : "var(--text-2)",
                        }}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Grid
                      </button>
                      <button
                        onClick={() => setViewMode("network")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all"
                        style={{
                          backgroundColor: viewMode === "network" ? `${accentBlue}20` : "transparent",
                          color: viewMode === "network" ? accentBlue : "var(--text-2)",
                        }}
                      >
                        <Network className="w-3.5 h-3.5" />
                        Network
                      </button>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all"
                      style={{
                        backgroundColor: `${accentBlue}18`,
                        border: `1px solid ${accentBlue}40`,
                        color: accentBlue,
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Agent
                    </motion.button>
                  </div>
                </div>

                {viewMode === "network" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <NetworkTopology
                      agents={agents}
                      selectedId={selectedAgentId}
                      onSelect={(id) => selectAgent(selectedAgentId === id ? null : id)}
                      width={880}
                      height={420}
                    />
                  </motion.div>
                )}

                <motion.div
                  layout
                  className="grid gap-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
                >
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      onSelect={() => selectAgent(selectedAgentId === agent.id ? null : agent.id)}
                      onAssignTask={() => setModalAgentId(agent.id)}
                    />
                  ))}
                </motion.div>
              </main>
            )}

            {/* ── Presets ── */}
            {activeTab === "presets" && <PresetsView />}

            {/* ── Database ── */}
            {activeTab === "database" && <DatabaseView />}

            {/* ── Placeholder tabs ── */}
            {PLACEHOLDER_TABS.includes(activeTab) && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentBlue}12`, border: `1px solid ${accentBlue}25` }}
                >
                  <span className="text-xl font-mono font-black" style={{ color: accentBlue }}>?</span>
                </div>
                <p className="text-sm font-mono font-bold capitalize" style={{ color: "var(--text-1)" }}>
                  {activeTab.replace("-", " ")}
                </p>
                <p className="text-xs font-mono" style={{ color: "var(--text-2)" }}>Coming soon</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalAgent && (
          modalAgent.backend === "n8n" ? (
            <N8nChatModal
              key={modalAgent.id}
              agent={modalAgent}
              onClose={() => setModalAgentId(null)}
            />
          ) : (
            <AssignTaskModal
              key={modalAgent.id}
              agentId={modalAgent.id}
              agentName={modalAgent.name}
              onClose={() => setModalAgentId(null)}
              onSubmit={handleRunTask}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
