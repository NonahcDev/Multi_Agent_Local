"""
WebSocket endpoints

  /ws/dashboard          — browser dashboard connects here
  /ws/agent/{agent_id}   — each agent machine connects here

Message protocol → see models/messages.py
"""
from __future__ import annotations
import json
import logging
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.agent_registry import registry
from core.websocket_manager import manager
from models.agent import AgentRegistration, HardwareMetrics, ModelInfo, AgentStatus
from models.messages import MessageType, LogLevel
from services.orchestrator import orchestrator

logger = logging.getLogger("ws_router")
router = APIRouter(tags=["websocket"])


# ------------------------------------------------------------------ #
# Dashboard endpoint — one connection per browser tab                 #
# ------------------------------------------------------------------ #

@router.websocket("/ws/dashboard")
async def dashboard_ws(ws: WebSocket):
    await manager.connect_dashboard(ws)
    try:
        # Send current state immediately on connect
        await manager.broadcast_agents_update(registry.to_serializable())

        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")
            payload = msg.get("payload", {})

            if msg_type == MessageType.PING:
                await ws.send_text(json.dumps({"type": MessageType.PONG}))

            elif msg_type == MessageType.TASK_ASSIGN:
                try:
                    await orchestrator.assign_task(
                        prompt=payload.get("prompt", ""),
                        agent_id=payload.get("agent_id"),
                        model=payload.get("model"),
                    )
                except RuntimeError as exc:
                    await ws.send_text(json.dumps({
                        "type": "error",
                        "payload": {"message": str(exc)},
                    }))

    except WebSocketDisconnect:
        manager.disconnect_dashboard(ws)


# ------------------------------------------------------------------ #
# Agent endpoint — one connection per physical machine                #
# ------------------------------------------------------------------ #

@router.websocket("/ws/agent/{agent_id}")
async def agent_ws(ws: WebSocket, agent_id: str):
    await manager.connect_agent(ws, agent_id)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")
            payload = msg.get("payload", {})

            # ---- REGISTER ---- #
            if msg_type == MessageType.AGENT_REGISTER:
                reg = AgentRegistration(
                    agent_id=agent_id,
                    name=payload.get("name", agent_id),
                    hostname=payload.get("hostname", agent_id),
                    ip_address=payload.get("ip_address", "unknown"),
                    hardware=HardwareMetrics(**payload.get("hardware", {})),
                    model=ModelInfo(**payload.get("model", {})),
                )
                state = registry.register(reg)
                await manager.broadcast_log(
                    agent_id, LogLevel.info,
                    f"Agent '{state.name}' registered — {state.hostname}",
                )
                await manager.broadcast_agents_update(registry.to_serializable())

            # ---- HEARTBEAT ---- #
            elif msg_type == MessageType.AGENT_HEARTBEAT:
                hw_raw = payload.get("hardware", {})
                model_raw = payload.get("model", {})
                status_raw = payload.get("status", "online")

                try:
                    hw = HardwareMetrics(**hw_raw)
                    model = ModelInfo(**model_raw)
                    status = AgentStatus(status_raw)
                except Exception as exc:
                    logger.warning("Bad heartbeat from %s: %s", agent_id, exc)
                    continue

                registry.heartbeat(agent_id, hw, model, status)
                await manager.broadcast_agents_update(registry.to_serializable())

            # ---- TASK EVENTS ---- #
            elif msg_type == MessageType.TASK_TOKEN:
                await orchestrator.on_task_token(
                    agent_id,
                    payload.get("task_id", ""),
                    payload.get("token", ""),
                )

            elif msg_type == MessageType.TASK_COMPLETE:
                await orchestrator.on_task_complete(
                    agent_id,
                    payload.get("task_id", ""),
                    payload.get("result", ""),
                    payload.get("duration_ms"),
                )

            elif msg_type == MessageType.TASK_FAILED:
                await orchestrator.on_task_failed(
                    agent_id,
                    payload.get("task_id", ""),
                    payload.get("error", "unknown error"),
                )

            # ---- PING ---- #
            elif msg_type == MessageType.PING:
                await ws.send_text(json.dumps({"type": MessageType.PONG}))

    except WebSocketDisconnect:
        manager.disconnect_agent(agent_id)
        registry.mark_disconnected(agent_id)
        await manager.broadcast_log(agent_id, LogLevel.warn, f"Agent '{agent_id}' disconnected")
        await manager.broadcast_agents_update(registry.to_serializable())
