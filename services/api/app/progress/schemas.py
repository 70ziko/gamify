from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.progress.levels import LevelInfo


class StreakOut(BaseModel):
    current: int
    longest: int
    freezes: int
    active_today: bool
    at_risk: bool


class QuestOut(BaseModel):
    code: str
    title: str
    xp: int
    progress: int
    target: int
    done: bool


class ProgressOut(BaseModel):
    total_xp: int
    level: LevelInfo
    streak: StreakOut
    today_xp: int
    daily_xp_goal: int
    quests: list[QuestOut]


class CompletionOut(BaseModel):
    xp_awarded: int
    total_xp: int
    level: LevelInfo
    streak: StreakOut
    quests_completed: list[QuestOut]


class DayXp(BaseModel):
    day: date
    xp: int


class LeagueEntry(BaseModel):
    rank: int
    user_id: UUID
    handle: str | None
    display_name: str | None
    xp: int


class LeagueOut(BaseModel):
    ends_at: datetime
    entries: list[LeagueEntry]
    me: LeagueEntry
