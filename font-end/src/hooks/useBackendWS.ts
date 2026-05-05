"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAgentStore } from "@/store/agentStore";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/dashboard";
const RECONNECT_DELAY_MS = 3000;
const PING_INTERVAL_MS = 10000;

export type WsStatus = "connecting" | "connected" | "disconnected" | "error";

/**
 * Connects to the FastAPI WebSocket backend.
 * When connected, real agent data replaces the simulated data.
 * On disconnect/error, the store falls back to simulation mode automatically.
 */
export function useBackendWS() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const setWsStatus = useAgentStore((s) => s.setWsStatus);
  const setAgentsFromBackend = useAgentStore((s) => s.setAgentsFromBackend);
  const appendChatToken = useAgentStore((s) => s.appendChatToken);
  const finishChatMessage = useAgentStore((s) => s.finishChatMessage);
  const setPlan = useAgentStore((s) => s.setPlan);
  const updatePlanTask = useAgentStore((s) => s.updatePlanTask);

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (pingTimer.current) clearInterval(pingTimer.current);
  }, []);

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    setWsStatus("connecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      setWsStatus("error");
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      setWsStatus("connected");
      // keepalive
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const msg = JSON.parse(event.data as string);
        handleMessage(msg);
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onerror = () => {
      setWsStatus("error");
    };

    ws.onclose = () => {
      if (!isMounted.current) return;
      clearTimers();
      setWsStatus("disconnected");
      // schedule reconnect
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    function handleMessage(msg: { type: string; payload?: Record<string, unknown> }) {
      switch (msg.type) {
        case "agents.update": {
          const raw = (msg.payload as { agents?: unknown[] })?.agents;
          if (Array.isArray(raw)) {
            setAgentsFromBackend(raw);
          }
          break;
        }
        case "task.token": {
          const p = msg.payload as { task_id?: string; agent_id?: string; token?: string };
          if (p.agent_id && p.task_id && p.token !== undefined) {
            appendChatToken(p.agent_id, p.task_id, p.token);
          }
          break;
        }
        case "task.complete": {
          const p = msg.payload as { task_id?: string; agent_id?: string };
          if (p.agent_id && p.task_id) {
            finishChatMessage(p.agent_id, p.task_id);
          }
          break;
        }
        case "plan.created": {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setPlan(msg.payload as any);
          break;
        }
        case "plan.step.update": {
          const p = msg.payload as { plan_id?: string; task?: Record<string, unknown> };
          if (p.plan_id && p.task) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updatePlanTask(p.plan_id, p.task as any);
          }
          break;
        }
        case "log.entry":
          break;
        default:
          break;
      }
    }
  }, [setWsStatus, setAgentsFromBackend, appendChatToken, finishChatMessage, setPlan, updatePlanTask, clearTimers]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      clearTimers();
      wsRef.current?.close();
    };
  }, [connect, clearTimers]);

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { sendMessage };
}
