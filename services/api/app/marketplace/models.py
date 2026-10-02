from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Computed, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.profiles.models import Profile


class Listing(Base):
    __tablename__ = "marketplace_listings"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    author_id: Mapped[UUID]
    roadmap_id: Mapped[UUID | None]
    kind: Mapped[str]
    title: Mapped[str]
    summary: Mapped[str]
    category: Mapped[str]
    status: Mapped[str]
    is_official: Mapped[bool] = mapped_column(default=False)
    latest_version: Mapped[int] = mapped_column(default=1)
    installs: Mapped[int] = mapped_column(default=0)
    rating_avg: Mapped[Decimal] = mapped_column(default=0)
    rating_count: Mapped[int] = mapped_column(default=0)
    search: Mapped[Any] = mapped_column(
        TSVECTOR, Computed("to_tsvector('simple', title || ' ' || summary)"), deferred=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())

    author: Mapped[Profile] = relationship(
        primaryjoin="foreign(Listing.author_id) == Profile.id", lazy="joined", viewonly=True
    )


class ListingVersion(Base):
    __tablename__ = "listing_versions"

    listing_id: Mapped[UUID] = mapped_column(ForeignKey("marketplace_listings.id"), primary_key=True)
    version: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Review(Base):
    __tablename__ = "listing_reviews"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    listing_id: Mapped[UUID]
    user_id: Mapped[UUID]
    rating: Mapped[int]
    body: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
