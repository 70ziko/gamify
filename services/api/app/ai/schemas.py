from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.roadmaps.schemas import Level, RoadmapDraft, StepDraft

RunStatus = Literal["running", "succeeded", "failed", "cancelled"]


class RoadmapBrief(BaseModel):
    goal: str = Field(min_length=3, max_length=500)
    weeks: int = Field(default=12, ge=1, le=52)
    minutes_per_day: int = Field(default=15, ge=5, le=240)
    level: Level = "beginner"
    context: str = Field(default="", max_length=4000)


class RoadmapDraftRun(BaseModel):
    id: UUID
    status: RunStatus
    stage: str | None
    draft: RoadmapDraft | None
    created_at: datetime


class StepSuggestionRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    existing_steps: list[str] = Field(default_factory=list, max_length=30)
    count: int = Field(default=3, ge=1, le=10)


class StepSuggestions(BaseModel):
    steps: list[StepDraft]
