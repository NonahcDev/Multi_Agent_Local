from fastapi import APIRouter, HTTPException
from core.agent_registry import registry

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
async def list_agents():
    return {"agents": registry.to_serializable()}


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    agent = registry.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return agent.model_dump()
