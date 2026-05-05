"""
WebSocket message protocol — shared between server, agents, and dashboard.

Direction notation:
  A→S  agent → server
  S→A  server → agent
  S→D  server → dashboard (broadcast)
  D→S  dashboard → server
"""
from __future__ import annotations
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel


class MessageType(str, Enum):
    # Agent lifecycle (A→S)
    AGENT_REGISTER = "agent.register"
    AGENT_HEARTBEAT = "agent.heartbeat"
    AGENT_DISCONNECT = "agent.disconnect"

    # Task flow (D→S, S→A, A→S)
    TASK_ASSIGN = "task.assign"       # dashboard requests task
    TASK_RUN = "task.run"             # server sends task to agent
    TASK_TOKEN = "task.token"         # agent streams token
    TASK_COMPLETE = "task.complete"   # agent done
    TASK_FAILED = "task.failed"       # agent error

    # Server → Dashboard broadcasts
    AGENTS_UPDATE = "agents.update"
    TASK_UPDATE = "task.update"
    LOG_ENTRY = "log.entry"
    SYSTEM_STATS = "system.stats"

    # Plan lifecycle (S→D)
    PLAN_CREATED = "plan.created"
    PLAN_STEP_UPDATE = "plan.step.update"

    # Ping/pong
    PING = "ping"
    PONG = "pong"


class WsMessage(BaseModel):
    type: MessageType
    payload: dict[str, Any] = {}


class LogLevel(str, Enum):
    info = "info"
    warn = "warn"
    error = "error"
    debug = "debug"
    stream = "stream"
