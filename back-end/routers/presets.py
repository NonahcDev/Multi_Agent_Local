"""
Presets Router — CRUD for pre-prompt presets stored in presets.json

Endpoints:
    GET    /presets          — list all presets
    POST   /presets          — create a new preset
    PUT    /presets/{id}     — update a preset
    DELETE /presets/{id}     — delete a preset
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/presets", tags=["presets"])

PRESETS_PATH = Path(__file__).parent.parent / "presets.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> list[dict]:
    if not PRESETS_PATH.exists():
        return []
    try:
        return json.loads(PRESETS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save(data: list[dict]) -> None:
    PRESETS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


class PresetBody(BaseModel):
    name: str
    description: str = ""
    content: str


@router.get("")
async def list_presets():
    return {"presets": _load()}


@router.post("", status_code=201)
async def create_preset(body: PresetBody):
    presets = _load()
    preset = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "description": body.description.strip(),
        "content": body.content,
        "created_at": _now(),
        "updated_at": _now(),
    }
    presets.append(preset)
    _save(presets)
    return preset


@router.put("/{preset_id}")
async def update_preset(preset_id: str, body: PresetBody):
    presets = _load()
    for i, p in enumerate(presets):
        if p["id"] == preset_id:
            presets[i] = {
                **p,
                "name": body.name.strip(),
                "description": body.description.strip(),
                "content": body.content,
                "updated_at": _now(),
            }
            _save(presets)
            return presets[i]
    raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")


@router.delete("/{preset_id}", status_code=204)
async def delete_preset(preset_id: str):
    presets = _load()
    filtered = [p for p in presets if p["id"] != preset_id]
    if len(filtered) == len(presets):
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")
    _save(filtered)
