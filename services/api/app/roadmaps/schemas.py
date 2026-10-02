from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from app.progress.xp import step_xp

RoadmapKind = Literal["course", "habit"]
Level = Literal["beginner", "some", "solid"]
Category = Literal[
    "fitness", "languages", "music", "coding", "reading", "mindfulness", "finance", "cooking", "career", "art", "custom"
]


class QuizExercise(BaseModel):
    kind: Literal["quiz"]
    prompt: str
    options: list[str] = Field(min_length=2, max_length=6)
    answer: int = Field(ge=0)

    @model_validator(mode="after")
    def answer_in_options(self) -> "QuizExercise":
        if self.answer >= len(self.options):
            raise ValueError("answer must index into options")
        return self


class CheckExercise(BaseModel):
    kind: Literal["check"]
    prompt: str


class TimerExercise(BaseModel):
    kind: Literal["timer"]
    prompt: str
    minutes: int = Field(gt=0, le=240)


Exercise = Annotated[QuizExercise | CheckExercise | TimerExercise, Field(discriminator="kind")]


class StepDraft(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(default="", max_length=500)
    minutes: int = Field(gt=0, le=240)
    exercises: list[Exercise] = Field(default_factory=list, max_length=10)

    @computed_field
    @property
    def xp(self) -> int:
        return step_xp(self.minutes)


class UnitDraft(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(default="", max_length=500)
    steps: list[StepDraft] = Field(min_length=1, max_length=30)


class RoadmapDraft(BaseModel):
    kind: RoadmapKind
    title: str = Field(min_length=1, max_length=120)
    summary: str = Field(default="", max_length=1000)
    category: Category = "custom"
    level: Level = "beginner"
    units: list[UnitDraft] = Field(min_length=1, max_length=20)

    @computed_field
    @property
    def total_xp(self) -> int:
        return sum(step.xp for unit in self.units for step in unit.steps)


class RoadmapUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    summary: str | None = Field(default=None, max_length=1000)
    category: Category | None = None


class StepBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    title: str
    summary: str
    minutes: int
    xp: int


class StepOut(StepBase):
    done: bool


class StepDetail(StepBase):
    roadmap_id: UUID
    exercises: list[Exercise]


class NextStep(StepOut):
    unit_position: int
    unit_title: str


class UnitOut(BaseModel):
    id: UUID
    position: int
    title: str
    summary: str
    steps: list[StepOut]


class RoadmapSummary(BaseModel):
    id: UUID
    kind: RoadmapKind
    title: str
    summary: str
    category: Category
    level: Level
    source_listing_id: UUID | None
    created_at: datetime
    unit_count: int
    total_steps: int
    done_steps: int
    next_step: NextStep | None


class RoadmapOut(RoadmapSummary):
    units: list[UnitOut]
