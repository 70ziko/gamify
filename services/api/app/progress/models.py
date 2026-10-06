from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class XpEvent(Base):
    __tablename__ = "xp_events"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID]
    roadmap_id: Mapped[UUID | None]
    step_id: Mapped[UUID | None]
    amount: Mapped[int]
    source: Mapped[str]
    idempotency_key: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Streak(Base):
    __tablename__ = "streaks"

    user_id: Mapped[UUID] = mapped_column(primary_key=True)
    current: Mapped[int]
    longest: Mapped[int]
    freezes: Mapped[int]
    last_active_on: Mapped[date | None]


class League(Base):
    __tablename__ = "leagues"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    week_start: Mapped[date]
    tier: Mapped[int]
    closed_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class LeagueMember(Base):
    __tablename__ = "league_members"

    league_id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(primary_key=True)
    week_start: Mapped[date]
    outcome: Mapped[str | None]
    joined_at: Mapped[datetime] = mapped_column(server_default=func.now())
