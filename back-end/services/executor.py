"""
Executor Engine — runs a TaskPlan step by step.

Flow:
    while tasks not finished and iteration < max:
        pick next task (dependencies met, status=pending)
        call the appropriate tool
        validate output
        update task status
        continue / retry / stop
"""
from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Optional

import httpx

from core.websocket_manager import manager
from models.messages import LogLevel, MessageType
from models.task import PlanTask, TaskPlan, TaskStatus
from services.tool_registry import tool_registry

logger = logging.getLogger("executor")

TASKLIST_PATH = Path(__file__).parent.parent / "tasklist.json"
MEMORY_PATH = Path(__file__).parent.parent / "agent_memory.json"
OLLAMA_BASE = "http://localhost:11434"
GLOBAL_MODEL = "gpt-oss:20b"


# ── Persistence ────────────────────────────────────────────────────────────────

def load_memory() -> dict:
    if MEMORY_PATH.exists():
        try:
            return json.loads(MEMORY_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_memory(memory: dict) -> None:
    try:
        MEMORY_PATH.write_text(json.dumps(memory, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning("Could not save agent_memory.json: %s", exc)


def _save_tasklist(plan: TaskPlan) -> None:
    try:
        data = [t.model_dump(mode="json") for t in plan.tasks]
        TASKLIST_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning("Could not save tasklist.json: %s", exc)


# ── Plan helpers ───────────────────────────────────────────────────────────────

def _find_next_task(plan: TaskPlan) -> Optional[PlanTask]:
    """Return the first pending task whose dependency (if any) is done."""
    done_ids = {t.id for t in plan.tasks if t.status == TaskStatus.done}
    for task in plan.tasks:
        if task.status != TaskStatus.pending:
            continue
        dep = task.depends_on if task.depends_on is not None else task.input_from
        if dep is not None and dep not in done_ids:
            continue
        return task
    return None


def _all_finished(plan: TaskPlan) -> bool:
    return all(t.status in (TaskStatus.done, TaskStatus.failed) for t in plan.tasks)


# ── Tool execution ─────────────────────────────────────────────────────────────

async def _call_ollama(prompt: str) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/generate",
                json={"model": GLOBAL_MODEL, "prompt": prompt, "stream": False},
            )
            if resp.status_code == 200:
                result = resp.json().get("response", "")
                return bool(result.strip()), result
            return False, f"Ollama HTTP {resp.status_code}"
    except Exception as exc:
        return False, f"Ollama unreachable: {exc}"


async def _execute_tool(task: PlanTask, ctx: dict) -> tuple[bool, str]:
    """Execute one plan task. Returns (success, result_str)."""
    action = task.action
    prev_result = ctx.get(f"task_{task.input_from}_result", "") if task.input_from else ""

    if action == "write_file":
        # Prefer: task.output field → ctx["filename"] → default name
        filename = task.output or ctx.get("filename") or f"output_task_{task.id}.txt"
        content = prev_result or task.description
        try:
            path = Path(filename)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            ctx["filename"] = filename  # store for subsequent read_file
            return True, f"File written: {filename} ({len(content)} chars)"
        except Exception as exc:
            return False, str(exc)

    elif action == "read_file":
        # Prefer: task.output field → ctx["filename"] (set by write_file)
        filename = task.output or ctx.get("filename", "")
        if not filename:
            return False, "read_file: no filename specified"
        try:
            path = Path(filename)
            if not path.exists():
                return False, f"File not found: {filename}"
            return True, path.read_text(encoding="utf-8", errors="replace")
        except Exception as exc:
            return False, str(exc)

    elif action in ("generate_code", "analyze_text", "call_agent", "validate_output"):
        prompt = task.description or f"Perform action: {action}"
        if prev_result:
            prompt = f"{prompt}\n\nContext from previous step:\n{prev_result}"
        return await _call_ollama(prompt)

    else:
        return False, f"Unknown action: {action}"


def _validate_result(task: PlanTask, result: str) -> bool:
    if not result or not result.strip():
        return False
    if task.action == "write_file":
        return result.startswith("File written:")
    return True


# ── Main executor ──────────────────────────────────────────────────────────────

async def execute_plan(plan: TaskPlan) -> TaskPlan:
    """Run the executor loop for a plan. Mutates and returns the plan."""
    ctx: dict = {}
    plan.status = TaskStatus.running

    await manager.broadcast_to_dashboards({
        "type": MessageType.PLAN_CREATED,
        "payload": plan.model_dump(mode="json"),
    })
    _save_tasklist(plan)

    while plan.iteration < plan.max_iterations:
        if _all_finished(plan):
            break

        task = _find_next_task(plan)
        if task is None:
            logger.warning("[Executor] No runnable task — possible deadlock")
            break

        task.status = TaskStatus.running
        plan.iteration += 1
        _save_tasklist(plan)

        await manager.broadcast_to_dashboards({
            "type": MessageType.PLAN_STEP_UPDATE,
            "payload": {"plan_id": plan.id, "task": task.model_dump(mode="json")},
        })
        await manager.broadcast_log(
            "global", LogLevel.info,
            f"[Plan] Step {plan.iteration}: {task.action} — {task.description[:60]}"
        )

        success, result = await _execute_tool(task, ctx)
        tool_registry.update_success_rate(task.action, success)

        if success and _validate_result(task, result):
            task.status = TaskStatus.done
            task.result = result
            ctx[f"task_{task.id}_result"] = result
            await manager.broadcast_log("global", LogLevel.info, f"[Plan] Task {task.id} done")
        else:
            task.retry += 1
            if task.retry >= task.max_retry:
                task.status = TaskStatus.failed
                task.error = result
                await manager.broadcast_log(
                    "global", LogLevel.error,
                    f"[Plan] Task {task.id} failed after {task.max_retry} retries: {result[:80]}"
                )
            else:
                task.status = TaskStatus.pending  # back to pending for retry
                await manager.broadcast_log(
                    "global", LogLevel.warn,
                    f"[Plan] Task {task.id} retry {task.retry}/{task.max_retry}"
                )

        _save_tasklist(plan)
        await manager.broadcast_to_dashboards({
            "type": MessageType.PLAN_STEP_UPDATE,
            "payload": {"plan_id": plan.id, "task": task.model_dump(mode="json")},
        })

    failed = [t for t in plan.tasks if t.status == TaskStatus.failed]
    plan.status = TaskStatus.failed if failed else TaskStatus.done

    # Update performance memory
    memory = load_memory()
    for t in plan.tasks:
        key = t.action
        if key not in memory:
            memory[key] = {"success": 0, "total": 0, "success_rate": 1.0}
        memory[key]["total"] += 1
        if t.status == TaskStatus.done:
            memory[key]["success"] += 1
        total = memory[key]["total"]
        memory[key]["success_rate"] = memory[key]["success"] / total if total else 1.0
    save_memory(memory)

    await manager.broadcast_to_dashboards({
        "type": MessageType.PLAN_CREATED,
        "payload": plan.model_dump(mode="json"),
    })

    return plan
