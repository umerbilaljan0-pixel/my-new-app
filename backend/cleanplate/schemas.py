"""Pydantic request/response models shared by the internal API and /v1."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

Quality = Literal["fast", "balanced", "best"]
ToolSlug = Literal[
    "erase", "uplift", "revive", "isolate", "extend", "smooth", "clarify", "stack"
]


class Estimate(BaseModel):
    output_size_bytes: int
    output_size_label: str
    vram_mb: int
    eta_seconds: float
    output_resolution: Optional[str] = None
    notes: list[str] = Field(default_factory=list)


class JobCreate(BaseModel):
    tool: ToolSlug
    upload_id: str = Field(..., description="id returned by POST /uploads")
    params: dict[str, Any] = Field(default_factory=dict)
    quality: Quality = "balanced"
    priority: int = 0
    webhook_url: Optional[str] = None


class StackStage(BaseModel):
    tool: ToolSlug
    params: dict[str, Any] = Field(default_factory=dict)
    quality: Quality = "balanced"


class StackPreset(BaseModel):
    name: str
    stages: list[StackStage]
    version: int = 1


class JobOut(BaseModel):
    id: str
    tool: str
    status: str
    params: dict[str, Any]
    input_path: Optional[str]
    output_path: Optional[str]
    thumbnail: Optional[str]
    media_kind: Optional[str]
    stage: Optional[str]
    stage_index: int
    stage_count: int
    progress: float
    eta_seconds: Optional[float]
    message: Optional[str]
    error: Optional[str]
    est_size_bytes: Optional[int]
    est_vram_mb: Optional[int]
    created_at: float
    updated_at: float
    finished_at: Optional[float]

    @classmethod
    def from_row(cls, row: dict) -> "JobOut":
        return cls(**{k: row.get(k) for k in cls.model_fields})


class RightsConfirm(BaseModel):
    context: Literal["first_launch", "export"] = "export"
    confirmed: bool
    filename: Optional[str] = None
    job_id: Optional[str] = None
    note: Optional[str] = None
