from fastapi import APIRouter

from app.auth import CurrentUser
from app.db import Session
from app.profiles import service
from app.profiles.models import Profile
from app.profiles.schemas import ProfileOut, ProfileUpdate, PublicProfile

router = APIRouter(tags=["profiles"])


@router.get("/me", response_model=ProfileOut)
async def read_me(user: CurrentUser, session: Session) -> Profile:
    return await service.get_profile(session, user.id)


@router.patch("/me", response_model=ProfileOut)
async def update_me(changes: ProfileUpdate, user: CurrentUser, session: Session) -> Profile:
    return await service.update_profile(session, user.id, changes)


@router.get("/profiles/{handle}", response_model=PublicProfile)
async def read_profile(handle: str, _: CurrentUser, session: Session) -> Profile:
    return await service.get_by_handle(session, handle)
