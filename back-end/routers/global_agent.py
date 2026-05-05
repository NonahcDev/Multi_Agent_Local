"""
Global Agent Router.

Endpoints:
    POST /global/plan        — generate a structured JSON task plan via LLM
    POST /global/execute     — execute a TaskPlan through the Executor Engine
    GET  /global/tools       — list Tool Registry
    GET  /global/memory      — get agent performance memory
    GET  /global/tasklist    — get current tasklist.json
    POST /global/file/read   — read + optionally analyse a file
    POST /global/file/write  — write a file
"""
import json
import re
from pathlib import Path

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from models.task import TaskPlan, PlanTask, TaskStatus
from services.executor import execute_plan, load_memory, TASKLIST_PATH
from services.tool_registry import tool_registry
from core.agent_registry import registry

router = APIRouter(prefix="/global", tags=["global"])

OLLAMA_BASE = "http://localhost:11434"
GLOBAL_MODEL = "gpt-oss:20b"
MAX_FILE_CHARS = 12_000

# In-memory store for active plans
_plans: dict[str, TaskPlan] = {}

# ── Planning prompt ────────────────────────────────────────────────────────────

_PLANNING_SYSTEM = """You are a task planning AI for a multi-agent orchestration system.
Break down the user request into a structured, executable task plan.

Available tools:
{tools}

Available agents:
{agents}

Rules:
1. Output ONLY valid JSON — no explanation, no markdown
2. Each task must use one of the available tools listed above
3. Use depends_on to chain tasks that need results from a previous step
4. Keep descriptions clear and specific
5. Maximum 8 tasks per plan
6. For write_file tasks: set "output" to the exact filename (e.g. "hello.py", "report.txt")
7. For read_file tasks: set "output" to the exact filename to read

Required JSON format:
{{
  "goal": "brief description of the overall goal",
  "tasks": [
    {{
      "id": 1,
      "action": "tool_name",
      "agent": "global",
      "description": "specific instruction for this task",
      "depends_on": null,
      "output": "exact filename for write_file/read_file, or expected output for other tools"
    }}
  ]
}}"""

_PLANNING_USER = "User request: {prompt}\n\nGenerate the task plan JSON:"


def _extract_json(text: str) -> str:
    """Extract JSON from LLM response that may contain markdown code blocks."""
    # Try to find ```json ... ``` block
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
    # Try to find first { ... } block
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        return match.group(1)
    return text.strip()


# ── Request models ─────────────────────────────────────────────────────────────

class PlanRequest(BaseModel):
    prompt: str


class ExecuteRequest(BaseModel):
    plan_id: str | None = None
    plan: TaskPlan | None = None  # can pass plan directly


class FileReadRequest(BaseModel):
    file_path: str
    analyze: bool = False
    prompt: str = "Analyze this file and summarize the key information:"


class FileWriteRequest(BaseModel):
    file_path: str
    content: str


# ── Plan endpoints ─────────────────────────────────────────────────────────────

@router.post("/plan")
async def create_plan(body: PlanRequest):
    """Generate a structured JSON task plan from a user prompt via LLM."""
    tools_text = tool_registry.to_prompt_text()
    agents_text = "\n".join(
        f"- {a.id}: {a.name} ({a.status})" for a in registry.all()
    ) or "- global: Global Agent (online)"

    system_prompt = _PLANNING_SYSTEM.format(tools=tools_text, agents=agents_text)
    full_prompt = f"{system_prompt}\n\n{_PLANNING_USER.format(prompt=body.prompt)}"

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/generate",
                json={"model": GLOBAL_MODEL, "prompt": full_prompt, "stream": False},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Ollama error HTTP {resp.status_code}")

            raw_response = resp.json().get("response", "")
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama unreachable")

    json_str = _extract_json(raw_response)
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"LLM did not return valid JSON: {exc}. Raw: {raw_response[:200]}",
        )

    tasks = []
    for i, t in enumerate(data.get("tasks", []), start=1):
        tasks.append(PlanTask(
            id=t.get("id", i),
            action=t.get("action", "analyze_text"),
            agent=t.get("agent", "global"),
            description=t.get("description", ""),
            depends_on=t.get("depends_on"),
            input_from=t.get("input_from"),
            output=t.get("output"),
            status=TaskStatus.pending,
            max_retry=3,
        ))

    plan = TaskPlan(goal=data.get("goal", body.prompt), tasks=tasks)
    _plans[plan.id] = plan
    return plan.model_dump(mode="json")


@router.post("/execute")
async def execute(body: ExecuteRequest, background_tasks: BackgroundTasks):
    """Execute a TaskPlan through the Executor Engine (runs in background)."""
    if body.plan:
        plan = body.plan
        _plans[plan.id] = plan
    elif body.plan_id:
        plan = _plans.get(body.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail=f"Plan '{body.plan_id}' not found")
    else:
        raise HTTPException(status_code=400, detail="Provide either plan or plan_id")

    background_tasks.add_task(execute_plan, plan)
    return {"plan_id": plan.id, "status": "executing", "tasks": len(plan.tasks)}


@router.get("/tools")
async def list_tools():
    """Return the Tool Registry — all available tools with metadata."""
    return {"tools": [t.model_dump() for t in tool_registry.list_tools()]}


@router.get("/memory")
async def get_memory():
    """Return the agent performance memory (learned success rates)."""
    return {"memory": load_memory()}


@router.get("/tasklist")
async def get_tasklist():
    """Return the current tasklist.json (persisted task plan)."""
    if not TASKLIST_PATH.exists():
        return {"tasks": []}
    try:
        data = json.loads(TASKLIST_PATH.read_text(encoding="utf-8"))
        return {"tasks": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/plans")
async def list_plans():
    """Return all in-memory plans."""
    return {"plans": [p.model_dump(mode="json") for p in _plans.values()]}


# ── File endpoints (existing) ──────────────────────────────────────────────────

@router.post("/file/read")
async def read_file(body: FileReadRequest):
    path = Path(body.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {body.file_path}")
    if not path.is_file():
        raise HTTPException(status_code=400, detail=f"Not a file: {body.file_path}")

    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    result: dict = {"file_path": str(path), "content": content, "analysis": None}

    if body.analyze:
        truncated = content[:MAX_FILE_CHARS]
        ai_prompt = f"{body.prompt}\n\n---\n{truncated}"
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{OLLAMA_BASE}/api/generate",
                    json={"model": GLOBAL_MODEL, "prompt": ai_prompt, "stream": False},
                )
                result["analysis"] = resp.json().get("response", "") if resp.status_code == 200 else f"Ollama error: HTTP {resp.status_code}"
        except Exception as exc:
            result["analysis"] = f"Ollama unreachable: {exc}"

    return result


@router.post("/file/write")
async def write_file(body: FileWriteRequest):
    path = Path(body.file_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body.content, encoding="utf-8")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {"file_path": str(path), "written": True, "size": len(body.content)}
