from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import Select, desc, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import AuthUser
from app.errors import Conflict, Forbidden, NotFound
from app.marketplace.models import Listing, ListingVersion, Review
from app.marketplace.schemas import (
    LeaderboardEntry,
    ListingDetail,
    ListingOut,
    ListingSort,
    ListingUpdate,
    PublishRequest,
    ReviewIn,
)
from app.profiles.models import Profile
from app.progress.models import XpEvent
from app.roadmaps import service as roadmaps
from app.roadmaps.models import Roadmap
from app.roadmaps.schemas import Category, RoadmapDraft, RoadmapKind, RoadmapOut

PUBLIC_STATUSES = ("published", "unlisted")


def is_visible(listing: Listing, user: AuthUser) -> bool:
    return listing.status in PUBLIC_STATUSES or listing.author_id == user.id or user.is_staff


async def visible_listing(session: AsyncSession, user: AuthUser, listing_id: UUID) -> Listing:
    listing = await session.get(Listing, listing_id)
    if listing is None or not is_visible(listing, user):
        raise NotFound("Listing not found")
    return listing


async def authored_listing(session: AsyncSession, user_id: UUID, listing_id: UUID) -> Listing:
    listing = await session.get(Listing, listing_id)
    if listing is None or listing.author_id != user_id:
        raise NotFound("Listing not found")
    return listing


def snapshot(listing: Listing, draft: RoadmapDraft) -> ListingVersion:
    listing.kind = draft.kind
    listing.title = draft.title
    listing.summary = draft.summary
    listing.category = draft.category
    return ListingVersion(listing_id=listing.id, version=listing.latest_version, content=draft.model_dump(mode="json"))


def browse_query(
    q: str | None, category: Category | None, kind: RoadmapKind | None, official: bool | None, sort: ListingSort
) -> Select[tuple[Listing]]:
    stmt = select(Listing).where(Listing.status == "published")
    if q:
        stmt = stmt.where(Listing.search.op("@@")(func.websearch_to_tsquery("simple", q)))
    if category:
        stmt = stmt.where(Listing.category == category)
    if kind:
        stmt = stmt.where(Listing.kind == kind)
    if official is not None:
        stmt = stmt.where(Listing.is_official.is_(official))
    if sort == "top_week":
        weekly_installs = (
            select(func.count())
            .where(
                Roadmap.source_listing_id == Listing.id,
                Roadmap.created_at >= datetime.now(UTC) - timedelta(days=7),
            )
            .correlate(Listing)
            .scalar_subquery()
        )
        return stmt.order_by(weekly_installs.desc(), Listing.installs.desc())
    if sort == "rating":
        return stmt.order_by(Listing.rating_avg.desc(), Listing.rating_count.desc())
    return stmt.order_by(Listing.created_at.desc())


async def browse(
    session: AsyncSession,
    *,
    q: str | None,
    category: Category | None,
    kind: RoadmapKind | None,
    official: bool | None,
    sort: ListingSort,
    limit: int,
    offset: int,
) -> list[Listing]:
    stmt = browse_query(q, category, kind, official, sort).limit(limit).offset(offset)
    return list((await session.scalars(stmt)).all())


async def leaderboard(session: AsyncSession, listing_id: UUID, limit: int = 10) -> list[LeaderboardEntry]:
    xp = func.sum(XpEvent.amount).label("xp")
    stmt = (
        select(Profile.id, Profile.handle, Profile.display_name, xp)
        .join(Roadmap, Roadmap.id == XpEvent.roadmap_id)
        .join(Profile, Profile.id == XpEvent.user_id)
        .where(Roadmap.source_listing_id == listing_id)
        .group_by(Profile.id)
        .order_by(desc(xp))
        .limit(limit)
    )
    return [
        LeaderboardEntry(user_id=user_id, handle=handle, display_name=display_name, xp=total)
        for user_id, handle, display_name, total in (await session.execute(stmt)).all()
    ]


async def get_listing(session: AsyncSession, user: AuthUser, listing_id: UUID) -> ListingDetail:
    listing = await visible_listing(session, user, listing_id)
    version = await session.get_one(ListingVersion, (listing.id, listing.latest_version))
    return ListingDetail.model_validate(
        {
            **ListingOut.model_validate(listing).model_dump(),
            "content": version.content,
            "leaderboard": await leaderboard(session, listing.id),
        }
    )


async def publish(session: AsyncSession, user_id: UUID, request: PublishRequest) -> Listing:
    roadmap = await roadmaps.owned_roadmap(session, user_id, request.roadmap_id)
    if await session.scalar(select(Listing.id).where(Listing.roadmap_id == roadmap.id)):
        raise Conflict("Roadmap is already published; add a version instead")
    listing = Listing(id=uuid4(), author_id=user_id, roadmap_id=roadmap.id, status=request.status, latest_version=1)
    session.add(listing)
    session.add(snapshot(listing, roadmaps.to_draft(roadmap)))
    await session.flush()
    await session.refresh(listing, ["author"])
    return listing


async def publish_version(session: AsyncSession, user_id: UUID, listing_id: UUID) -> Listing:
    listing = await authored_listing(session, user_id, listing_id)
    if listing.roadmap_id is None:
        raise Conflict("Source roadmap no longer exists")
    roadmap = await roadmaps.owned_roadmap(session, user_id, listing.roadmap_id)
    listing.latest_version += 1
    listing.updated_at = datetime.now(UTC)
    session.add(snapshot(listing, roadmaps.to_draft(roadmap)))
    await session.flush()
    return listing


async def update_listing(session: AsyncSession, user: AuthUser, listing_id: UUID, changes: ListingUpdate) -> Listing:
    listing = await visible_listing(session, user, listing_id)
    staff_only = changes.is_official is not None or changes.status == "removed" or listing.status == "removed"
    if not user.is_staff and (listing.author_id != user.id or staff_only):
        raise Forbidden("Not allowed to change this listing")
    for field, value in changes.model_dump(exclude_none=True).items():
        setattr(listing, field, value)
    listing.updated_at = datetime.now(UTC)
    await session.flush()
    return listing


async def installed_roadmap(session: AsyncSession, user_id: UUID, listing_id: UUID) -> Roadmap | None:
    stmt = select(Roadmap).where(
        Roadmap.user_id == user_id, Roadmap.source_listing_id == listing_id, Roadmap.archived.is_(False)
    )
    return await session.scalar(stmt)


async def install(session: AsyncSession, user: AuthUser, listing_id: UUID) -> RoadmapOut:
    listing = await visible_listing(session, user, listing_id)
    if existing := await installed_roadmap(session, user.id, listing.id):
        return await roadmaps.get_roadmap(session, user.id, existing.id)
    version = await session.get_one(ListingVersion, (listing.id, listing.latest_version))
    roadmap = await roadmaps.create_roadmap(
        session,
        user.id,
        RoadmapDraft.model_validate(version.content),
        source_listing_id=listing.id,
        source_version=version.version,
    )
    await session.execute(update(Listing).where(Listing.id == listing.id).values(installs=Listing.installs + 1))
    return roadmaps.to_out(roadmap, set())


async def upsert_review(session: AsyncSession, user: AuthUser, listing_id: UUID, review: ReviewIn) -> Review:
    listing = await visible_listing(session, user, listing_id)
    if listing.author_id == user.id:
        raise Forbidden("Authors cannot review their own listing")
    installed = select(Roadmap.id).where(Roadmap.user_id == user.id, Roadmap.source_listing_id == listing.id)
    if await session.scalar(installed.limit(1)) is None:
        raise Forbidden("Install the listing before reviewing it")

    values = {"rating": review.rating, "body": review.body}
    stmt = (
        insert(Review)
        .values(listing_id=listing.id, user_id=user.id, **values)
        .on_conflict_do_update(index_elements=["listing_id", "user_id"], set_=values)
        .returning(Review)
        .execution_options(populate_existing=True)
    )
    saved = (await session.scalars(stmt)).one()

    ratings = select(Review.rating).where(Review.listing_id == listing.id).subquery()
    await session.execute(
        update(Listing)
        .where(Listing.id == listing.id)
        .values(
            rating_avg=select(func.coalesce(func.avg(ratings.c.rating), 0)).scalar_subquery(),
            rating_count=select(func.count()).select_from(ratings).scalar_subquery(),
        )
    )
    return saved
