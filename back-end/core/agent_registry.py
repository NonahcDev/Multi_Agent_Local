"""
In-memory agent registry.
Tracks registered agents and their latest state.
Periodically marks agents as offline when heartbeat times out.
"""
from __future__ import annotations
import asyncio
import logging
import time
from typing import Optional

from models.agent import AgentState, AgentStatus, AgentRegistration, HardwareMetrics, ModelInfo
from core.config import settings

logger = logging.getLogger("agent_registry")


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: dict[str, AgentState] = {}

    # ------------------------------------------------------------------ #
    # Registration                                                         #
    # ------------------------------------------------------------------ #

    def register(self, reg: AgentRegistration) -> AgentState:
        existing = self._agents.get(reg.agent_id)
        uptime = existing.uptime if existing else 0.0
        state = AgentState(
            id=reg.agent_id,
            name=reg.name,
            hostname=reg.hostname,
            ip_address=reg.ip_address,
            status=AgentStatus.online,
            hardware=reg.hardware,
            model=reg.model,
            last_seen=time.time(),
            uptime=uptime,
            connected=True,
        )
        self._agents[reg.agent_id] = state
        logger.info("Registered agent '%s' (%s)", reg.name, reg.agent_id)
        return state

    def mark_disconnected(self, agent_id: str) -> None:
        agent = self._agents.get(agent_id)
        if agent:
            agent.status = AgentStatus.offline
            agent.connected = False
            agent.model.active_task = None

    # ------------------------------------------------------------------ #
    # Heartbeat                                                            #
    # ------------------------------------------------------------------ #

    def heartbeat(
        self,
        agent_id: str,
        hardware: HardwareMetrics,
        model: ModelInfo,
        status: AgentStatus,
    ) -> Optional[AgentState]:
        agent = self._agents.get(agent_id)
        if not agent:
            return None
        now = time.time()
        agent.hardware = hardware
        agent.model = model
        agent.status = status
        agent.uptime += now - agent.last_seen
        agent.last_seen = now
        agent.connected = True
        return agent

    # ------------------------------------------------------------------ #
    # Queries                                                              #
    # ------------------------------------------------------------------ #

    def get(self, agent_id: str) -> Optional[AgentState]:
        return self._agents.get(agent_id)

    def all(self) -> list[AgentState]:
        return list(self._agents.values())

    def online(self) -> list[AgentState]:
        return [a for a in self._agents.values() if a.status not in (AgentStatus.offline, AgentStatus.error)]

    # ------------------------------------------------------------------ #
    # Stale check (called by background task)                              #
    # ------------------------------------------------------------------ #

    def expire_stale(self) -> list[str]:
        timeout = settings.agent_heartbeat_timeout
        now = time.time()
        expired = []
        for agent in self._agents.values():
            if agent.connected and (now - agent.last_seen) > timeout:
                logger.warning("Agent '%s' timed out — marking offline", agent.id)
                agent.status = AgentStatus.offline
                agent.connected = False
                expired.append(agent.id)
        return expired

    def to_serializable(self) -> list[dict]:
        return [a.model_dump() for a in self._agents.values()]


registry = AgentRegistry()
