from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.roadmaps.schemas import Category, RoadmapDraft, RoadmapKind

ListingStatus = Literal["draft", "published", "unlisted", "removed"]
ListingSort = Literal["top_week", "rating", "new"]


class Author(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    handle: str | None
    display_name: str | None


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author: Author
    kind: RoadmapKind
    title: str
    summary: str
    category: Category
    status: ListingStatus
    is_official: bool
    latest_version: int
    installs: int
    rating_avg: float
    rating_count: int
    created_at: datetime


class LeaderboardEntry(BaseModel):
    user_id: UUID
    handle: str | None
    display_name: str | None
    xp: int


class ListingDetail(ListingOut):
    content: RoadmapDraft
    leaderboard: list[LeaderboardEntry]


class PublishRequest(BaseModel):
    roadmap_id: UUID
    status: Literal["draft", "published", "unlisted"] = "published"


class ListingUpdate(BaseModel):
    status: ListingStatus | None = None
    is_official: bool | None = None


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    body: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    listing_id: UUID
    user_id: UUID
    rating: int
    body: str | None
    created_at: datetime
