"""
TASK-002 — FastAPI Server Entry Point

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
    GET  /health                   health check
    GET  /health/detailed          detailed system status
    GET  /agents                   list all registered agents
    GET  /agents/{id}              single agent state
    POST /tasks                    create & route task
    GET  /tasks                    list all tasks
    GET  /tasks/{id}               single task
    WS   /ws/dashboard             dashboard real-time feed
    WS   /ws/agent/{agent_id}      agent connection
"""
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.agent_registry import registry
from core.websocket_manager import manager
from routers import health, agents, tasks, ws, global_agent

# ------------------------------------------------------------------ #
# Logging                                                             #
# ------------------------------------------------------------------ #

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

# ------------------------------------------------------------------ #
# App                                                                  #
# ------------------------------------------------------------------ #

app = FastAPI(
    title="LocalAI Mesh — Orchestrator",
    description="Multi-Agent Ollama Orchestration Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(agents.router)
app.include_router(tasks.router)
app.include_router(ws.router)
app.include_router(global_agent.router)


# ------------------------------------------------------------------ #
# Background tasks                                                     #
# ------------------------------------------------------------------ #

async def _heartbeat_watchdog() -> None:
    """Periodically expire stale agents and broadcast updates."""
    while True:
        await asyncio.sleep(5)
        expired = registry.expire_stale()
        if expired:
            await manager.broadcast_agents_update(registry.to_serializable())


@app.on_event("startup")
async def startup() -> None:
    asyncio.create_task(_heartbeat_watchdog())
    logging.getLogger("main").info(
        "LocalAI Mesh server started — %s:%d", settings.host, settings.port
    )


# ------------------------------------------------------------------ #
# Dev runner                                                           #
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)
