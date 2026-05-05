"""
TASK-002 — Health check endpoints
GET /health          → {"status": "ok"}
GET /health/detailed → system stats
"""
from fastapi import APIRouter
from core.agent_registry import registry
from core.websocket_manager import manager

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.get("/health/detailed")
async def health_detailed():
    agents = registry.all()
    online = [a for a in agents if a.connected]
    return {
        "status": "ok",
        "agents": {
            "total": len(agents),
            "online": len(online),
            "ids": [a.id for a in online],
        },
        "dashboard_connections": manager.dashboard_count,
    }
