from uuid import UUID

from fastapi import APIRouter, Query, status

from app.auth import CurrentUser
from app.db import Session
from app.marketplace import service
from app.marketplace.models import Listing, Review
from app.marketplace.schemas import (
    ListingDetail,
    ListingOut,
    ListingSort,
    ListingUpdate,
    PublishRequest,
    ReviewIn,
    ReviewOut,
)
from app.roadmaps.schemas import Category, RoadmapKind, RoadmapOut

router = APIRouter(prefix="/marketplace/listings", tags=["marketplace"])


@router.get("", response_model=list[ListingOut])
async def browse_listings(
    _: CurrentUser,
    session: Session,
    q: str | None = Query(default=None, max_length=100),
    category: Category | None = None,
    kind: RoadmapKind | None = None,
    official: bool | None = None,
    sort: ListingSort = "top_week",
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
) -> list[Listing]:
    return await service.browse(
        session, q=q, category=category, kind=kind, official=official, sort=sort, limit=limit, offset=offset
    )


@router.post("", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
async def publish_listing(request: PublishRequest, user: CurrentUser, session: Session) -> Listing:
    return await service.publish(session, user.id, request)


@router.get("/{listing_id}")
async def read_listing(listing_id: UUID, user: CurrentUser, session: Session) -> ListingDetail:
    return await service.get_listing(session, user, listing_id)


@router.patch("/{listing_id}", response_model=ListingOut)
async def update_listing(listing_id: UUID, changes: ListingUpdate, user: CurrentUser, session: Session) -> Listing:
    return await service.update_listing(session, user, listing_id, changes)


@router.post("/{listing_id}/versions", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
async def publish_version(listing_id: UUID, user: CurrentUser, session: Session) -> Listing:
    return await service.publish_version(session, user.id, listing_id)


@router.post("/{listing_id}/install")
async def install_listing(listing_id: UUID, user: CurrentUser, session: Session) -> RoadmapOut:
    return await service.install(session, user, listing_id)


@router.put("/{listing_id}/review", response_model=ReviewOut)
async def review_listing(listing_id: UUID, review: ReviewIn, user: CurrentUser, session: Session) -> Review:
    return await service.upsert_review(session, user, listing_id, review)
