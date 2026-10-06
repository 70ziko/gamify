from fastapi import APIRouter

from app.auth import CurrentUser
from app.db import Session
from app.progress import service
from app.progress.schemas import DayXp, LeagueOut, ProgressOut, StreakOut

router = APIRouter(prefix="/me", tags=["progress"])


@router.get("/progress")
async def read_progress(user: CurrentUser, session: Session) -> ProgressOut:
    return await service.get_progress(session, user.id)


@router.get("/activity")
async def read_activity(user: CurrentUser, session: Session) -> list[DayXp]:
    return await service.activity(session, user.id)


@router.get("/league")
async def read_league(user: CurrentUser, session: Session) -> LeagueOut:
    return await service.league(session, user.id)


@router.post("/streak/freeze")
async def use_streak_freeze(user: CurrentUser, session: Session) -> StreakOut:
    return await service.use_freeze(session, user.id)
