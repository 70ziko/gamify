from datetime import datetime, time
from uuid import UUID

from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    handle: Mapped[str | None]
    display_name: Mapped[str | None]
    avatar_url: Mapped[str | None]
    interests: Mapped[list[str]] = mapped_column(ARRAY(Text))
    daily_xp_goal: Mapped[int]
    reminder_time: Mapped[time | None]
    timezone: Mapped[str]
    plan: Mapped[str]
    league_opt_in: Mapped[bool]
    created_at: Mapped[datetime]
