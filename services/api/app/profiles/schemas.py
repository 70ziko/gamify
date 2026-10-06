from datetime import datetime, time
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.roadmaps.schemas import Category


class PublicProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    handle: str | None
    display_name: str | None
    avatar_url: str | None
    created_at: datetime


class ProfileOut(PublicProfile):
    interests: list[Category]
    daily_xp_goal: int
    reminder_time: time | None
    timezone: str
    plan: Literal["free", "plus"]
    league_opt_in: bool


class ProfileUpdate(BaseModel):
    handle: str | None = Field(default=None, pattern=r"^[a-z0-9_.]{3,24}$")
    display_name: str | None = Field(default=None, max_length=60)
    avatar_url: str | None = None
    interests: list[Category] | None = None
    daily_xp_goal: int | None = Field(default=None, gt=0, le=1000)
    reminder_time: time | None = None
    timezone: str | None = None
    league_opt_in: bool | None = None

    @field_validator("timezone")
    @classmethod
    def known_timezone(cls, value: str | None) -> str | None:
        if value is not None:
            try:
                ZoneInfo(value)
            except (ZoneInfoNotFoundError, ValueError) as exc:
                raise ValueError("Unknown timezone") from exc
        return value

    @model_validator(mode="after")
    def required_fields_not_null(self) -> "ProfileUpdate":
        for field in ("handle", "interests", "daily_xp_goal", "timezone", "league_opt_in"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self
