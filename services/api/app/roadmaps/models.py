from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID]
    kind: Mapped[str]
    title: Mapped[str]
    summary: Mapped[str]
    category: Mapped[str]
    level: Mapped[str]
    source_listing_id: Mapped[UUID | None]
    source_version: Mapped[int | None]
    archived: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    units: Mapped[list["Unit"]] = relationship(
        order_by="Unit.position", cascade="all, delete-orphan", lazy="selectin"
    )


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    roadmap_id: Mapped[UUID] = mapped_column(ForeignKey("roadmaps.id"))
    position: Mapped[int]
    title: Mapped[str]
    summary: Mapped[str]

    steps: Mapped[list["Step"]] = relationship(
        order_by="Step.position", cascade="all, delete-orphan", lazy="selectin"
    )


class Step(Base):
    __tablename__ = "steps"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    unit_id: Mapped[UUID] = mapped_column(ForeignKey("units.id"))
    position: Mapped[int]
    title: Mapped[str]
    summary: Mapped[str]
    minutes: Mapped[int]
    xp: Mapped[int]
    exercises: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
