from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import time


class AgentStatus(str, Enum):
    online = "online"
    thinking = "thinking"
    idle = "idle"
    error = "error"
    offline = "offline"


class HardwareMetrics(BaseModel):
    cpu_usage: float = 0.0
    gpu_usage: float = 0.0
    ram_used: float = 0.0
    ram_total: float = 0.0
    vram_used: float = 0.0
    vram_total: float = 0.0
    temperature: float = 0.0
    power_draw: float = 0.0
    network_in: float = 0.0
    network_out: float = 0.0


class ModelInfo(BaseModel):
    name: str = "unknown"
    quantization: str = "Q4_K_M"
    tokens_per_sec: float = 0.0
    context_size: int = 4096
    context_used: int = 0
    active_task: Optional[str] = None


class AgentRegistration(BaseModel):
    agent_id: str
    name: str
    hostname: str
    ip_address: str
    hardware: HardwareMetrics = Field(default_factory=HardwareMetrics)
    model: ModelInfo = Field(default_factory=ModelInfo)


class AgentState(BaseModel):
    id: str
    name: str
    hostname: str
    ip_address: str
    status: AgentStatus = AgentStatus.offline
    hardware: HardwareMetrics = Field(default_factory=HardwareMetrics)
    model: ModelInfo = Field(default_factory=ModelInfo)
    last_seen: float = Field(default_factory=time.time)
    uptime: float = 0.0
    connections: list[str] = Field(default_factory=list)
    connected: bool = False
