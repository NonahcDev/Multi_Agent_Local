"""
TASK-003 — WebSocket Gateway

Manages two pools of connections:
  - dashboard clients  (browser frontend)
  - agent clients      (remote machines running Ollama)

Message routing:
  - Agent heartbeat → update agent state → broadcast to dashboards
  - Dashboard task.assign → route to target agent
  - Agent task.token → stream to all dashboard clients
"""
from __future__ import annotations
import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import WebSocket

from models.messages import MessageType, WsMessage, LogLevel

logger = logging.getLogger("ws_manager")


class ConnectionManager:
    def __init__(self) -> None:
        # agent_id → WebSocket
        self._agents: dict[str, WebSocket] = {}
        # set of dashboard WebSocket connections
        self._dashboards: set[WebSocket] = set()

    # ------------------------------------------------------------------ #
    # Connect / Disconnect                                                 #
    # ------------------------------------------------------------------ #

    async def connect_dashboard(self, ws: WebSocket) -> None:
        await ws.accept()
        self._dashboards.add(ws)
        logger.info("Dashboard connected — total: %d", len(self._dashboards))

    def disconnect_dashboard(self, ws: WebSocket) -> None:
        self._dashboards.discard(ws)
        logger.info("Dashboard disconnected — total: %d", len(self._dashboards))

    async def connect_agent(self, ws: WebSocket, agent_id: str) -> None:
        await ws.accept()
        self._agents[agent_id] = ws
        logger.info("Agent '%s' connected — total agents: %d", agent_id, len(self._agents))

    def disconnect_agent(self, agent_id: str) -> None:
        self._agents.pop(agent_id, None)
        logger.info("Agent '%s' disconnected", agent_id)

    # ------------------------------------------------------------------ #
    # Send helpers                                                         #
    # ------------------------------------------------------------------ #

    async def send_to_agent(self, agent_id: str, message: dict) -> bool:
        ws = self._agents.get(agent_id)
        if ws is None:
            return False
        try:
            await ws.send_text(json.dumps(message))
            return True
        except Exception as exc:
            logger.warning("Failed to send to agent '%s': %s", agent_id, exc)
            self.disconnect_agent(agent_id)
            return False

    async def broadcast_to_dashboards(self, message: dict) -> None:
        if not self._dashboards:
            return
        text = json.dumps(message)
        dead: set[WebSocket] = set()
        tasks = []
        for ws in self._dashboards:
            tasks.append(self._safe_send(ws, text, dead))
        await asyncio.gather(*tasks)
        for ws in dead:
            self._dashboards.discard(ws)

    async def _safe_send(self, ws: WebSocket, text: str, dead: set[WebSocket]) -> None:
        try:
            await ws.send_text(text)
        except Exception:
            dead.add(ws)

    # ------------------------------------------------------------------ #
    # Convenience message builders                                         #
    # ------------------------------------------------------------------ #

    async def broadcast_agents_update(self, agents_payload: list[dict]) -> None:
        await self.broadcast_to_dashboards(
            {"type": MessageType.AGENTS_UPDATE, "payload": {"agents": agents_payload}}
        )

    async def broadcast_log(
        self,
        agent_id: str,
        level: LogLevel,
        message: str,
        source: Optional[str] = None,
    ) -> None:
        now = time.time()
        import datetime
        ts = datetime.datetime.fromtimestamp(now).strftime("%H:%M:%S.") + str(int((now % 1) * 1000)).zfill(3)
        await self.broadcast_to_dashboards(
            {
                "type": MessageType.LOG_ENTRY,
                "payload": {
                    "id": f"{agent_id}-{int(now*1000)}",
                    "agent_id": agent_id,
                    "timestamp": ts,
                    "level": level,
                    "message": message,
                    "source": source or agent_id,
                },
            }
        )

    async def broadcast_task_update(self, task_payload: dict) -> None:
        await self.broadcast_to_dashboards(
            {"type": MessageType.TASK_UPDATE, "payload": task_payload}
        )

    # ------------------------------------------------------------------ #
    # Info                                                                 #
    # ------------------------------------------------------------------ #

    @property
    def connected_agent_ids(self) -> list[str]:
        return list(self._agents.keys())

    @property
    def dashboard_count(self) -> int:
        return len(self._dashboards)


# Singleton instance shared across the app
manager = ConnectionManager()
