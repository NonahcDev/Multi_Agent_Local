from fastapi import APIRouter, HTTPException
from models.task import TaskCreate
from services.orchestrator import orchestrator

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("")
async def create_task(body: TaskCreate):
    try:
        task = await orchestrator.assign_task(
            prompt=body.prompt,
            agent_id=body.agent_id,
            model=body.model,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return task.model_dump()


@router.get("")
async def list_tasks():
    return {"tasks": [t.model_dump() for t in orchestrator.get_all_tasks()]}


@router.get("/{task_id}")
async def get_task(task_id: str):
    task = orchestrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return task.model_dump()
