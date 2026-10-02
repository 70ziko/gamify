from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import Conflict, NotFound
from app.profiles.models import Profile
from app.profiles.schemas import ProfileUpdate


async def get_profile(session: AsyncSession, user_id: UUID) -> Profile:
    profile = await session.get(Profile, user_id)
    if profile is None:
        raise NotFound("Profile not found")
    return profile


async def get_by_handle(session: AsyncSession, handle: str) -> Profile:
    profile = await session.scalar(select(Profile).where(Profile.handle == handle))
    if profile is None:
        raise NotFound("Profile not found")
    return profile


async def update_profile(session: AsyncSession, user_id: UUID, changes: ProfileUpdate) -> Profile:
    profile = await get_profile(session, user_id)
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    try:
        await session.flush()
    except IntegrityError as exc:
        raise Conflict("Handle is taken") from exc
    return profile
