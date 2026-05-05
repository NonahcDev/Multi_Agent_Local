"""
Task Orchestrator.

Responsibilities:
  - Select best agent for a task (load-based routing)
  - Dispatch tasks via WebSocket to agent
  - Track running tasks
  - Stream tokens from agent back to dashboard
"""
from __future__ import annotations
import logging
import time
import uuid
from typing import Optional

from core.agent_registry import registry
from core.websocket_manager import manager
from models.agent import AgentStatus
from models.messages import MessageType, LogLevel
from models.task import Task, TaskStatus

logger = logging.getLogger("orchestrator")

# In-memory task store (use DB in production)
_tasks: dict[str, Task] = {}


class Orchestrator:

    async def assign_task(self, prompt: str, agent_id: Optional[str] = None, model: Optional[str] = None) -> Task:
        """Create a task and route it to the best available agent."""
        target_agent = self._pick_agent(agent_id)
        if target_agent is None:
            raise RuntimeError("No available agents to handle the task")

        task = Task(
            id=str(uuid.uuid4()),
            description=prompt[:80] + ("..." if len(prompt) > 80 else ""),
            prompt=prompt,
            agent_id=target_agent.id,
            status=TaskStatus.queued,
        )
        _tasks[task.id] = task

        await manager.broadcast_log(
            target_agent.id,
            LogLevel.info,
            f"Task queued: {task.description}",
        )

        # Send to agent via WebSocket
        dispatched = await manager.send_to_agent(
            target_agent.id,
            {
                "type": MessageType.TASK_RUN,
                "payload": {
                    "task_id": task.id,
                    "prompt": task.prompt,
                    "model": model or target_agent.model.name,
                },
            },
        )

        if dispatched:
            task.status = TaskStatus.running
            task.started_at = time.time()
            logger.info("Task %s dispatched to agent '%s'", task.id[:8], target_agent.id)
        else:
            task.status = TaskStatus.failed
            logger.error("Failed to dispatch task %s — agent not connected", task.id[:8])

        await manager.broadcast_task_update(task.model_dump())
        return task

    def _pick_agent(self, preferred_id: Optional[str]) -> Optional[object]:
        """Return preferred agent if online, else least-loaded online agent."""
        online = registry.online()
        if not online:
            return None

        if preferred_id:
            agent = registry.get(preferred_id)
            if agent and agent.status != AgentStatus.offline:
                return agent

        # Route to agent with lowest GPU usage
        return min(online, key=lambda a: a.hardware.gpu_usage)

    async def on_task_token(self, agent_id: str, task_id: str, token: str) -> None:
        task = _tasks.get(task_id)
        if task:
            task.tokens_generated += 1

        await manager.broadcast_to_dashboards(
            {
                "type": MessageType.TASK_TOKEN,
                "payload": {"task_id": task_id, "agent_id": agent_id, "token": token},
            }
        )

    async def on_task_complete(
        self, agent_id: str, task_id: str, result: str, duration_ms: Optional[int] = None
    ) -> None:
        task = _tasks.get(task_id)
        if task:
            task.status = TaskStatus.done
            task.result = result
            task.finished_at = time.time()
            task.progress = 100.0
            if duration_ms:
                task.duration_ms = duration_ms
            await manager.broadcast_task_update(task.model_dump())
            await manager.broadcast_log(agent_id, LogLevel.info, f"Task {task_id[:8]} completed")

    async def on_task_failed(self, agent_id: str, task_id: str, error: str) -> None:
        task = _tasks.get(task_id)
        if task:
            task.status = TaskStatus.failed
            task.finished_at = time.time()
            await manager.broadcast_task_update(task.model_dump())
            await manager.broadcast_log(agent_id, LogLevel.error, f"Task {task_id[:8]} failed: {error}")

    def get_all_tasks(self) -> list[Task]:
        return list(_tasks.values())

    def get_task(self, task_id: str) -> Optional[Task]:
        return _tasks.get(task_id)


orchestrator = Orchestrator()
