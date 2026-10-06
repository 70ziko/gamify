from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import Conflict
from app.profiles.models import Profile
from app.profiles.service import get_profile
from app.progress.levels import level_from_xp
from app.progress.models import Streak, XpEvent
from app.progress.quests import QUESTS, Quest
from app.progress.schemas import CompletionOut, DayXp, LeagueEntry, LeagueOut, ProgressOut, QuestOut, StreakOut

ACTIVITY_DAYS = 28
LEAGUE_SIZE = 20


def local_today(timezone: str, now: datetime | None = None) -> date:
    return (now or datetime.now(UTC)).astimezone(ZoneInfo(timezone)).date()


def day_bounds(day: date, timezone: str) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, ZoneInfo(timezone))
    return start, datetime.combine(day + timedelta(days=1), time.min, ZoneInfo(timezone))


def week_start(now: datetime | None = None) -> datetime:
    today = (now or datetime.now(UTC)).date()
    return datetime.combine(today - timedelta(days=today.weekday()), time.min, UTC)


def advance_streak(streak: Streak, today: date) -> None:
    if streak.last_active_on == today:
        return
    continues = streak.last_active_on == today - timedelta(days=1)
    streak.current = streak.current + 1 if continues else 1
    streak.longest = max(streak.longest, streak.current)
    streak.last_active_on = today


def streak_state(streak: Streak, today: date) -> StreakOut:
    gap = (today - streak.last_active_on).days if streak.last_active_on else None
    at_risk = gap == 2 and streak.current > 0
    alive = gap is not None and gap <= 1
    return StreakOut(
        current=streak.current if alive or at_risk else 0,
        longest=streak.longest,
        freezes=streak.freezes,
        active_today=gap == 0,
        at_risk=at_risk,
    )


def quest_progress(quest: Quest, steps_today: int) -> QuestOut:
    return QuestOut(
        code=quest.code,
        title=quest.title,
        xp=quest.xp,
        progress=min(steps_today, quest.steps_target),
        target=quest.steps_target,
        done=steps_today >= quest.steps_target,
    )


async def award(
    session: AsyncSession,
    user_id: UUID,
    amount: int,
    source: str,
    key: str,
    *,
    roadmap_id: UUID | None = None,
    step_id: UUID | None = None,
) -> bool:
    stmt = (
        insert(XpEvent)
        .values(
            user_id=user_id,
            roadmap_id=roadmap_id,
            step_id=step_id,
            amount=amount,
            source=source,
            idempotency_key=key,
        )
        .on_conflict_do_nothing(index_elements=["user_id", "idempotency_key"])
        .returning(XpEvent.id)
    )
    return await session.scalar(stmt) is not None


async def total_xp(session: AsyncSession, user_id: UUID) -> int:
    stmt = select(func.coalesce(func.sum(XpEvent.amount), 0)).where(XpEvent.user_id == user_id)
    return await session.scalar(stmt) or 0


async def day_totals(session: AsyncSession, user_id: UUID, day: date, timezone: str) -> tuple[int, int]:
    start, end = day_bounds(day, timezone)
    stmt = select(
        func.coalesce(func.sum(XpEvent.amount), 0),
        func.count().filter(XpEvent.source == "step_complete"),
    ).where(XpEvent.user_id == user_id, XpEvent.created_at >= start, XpEvent.created_at < end)
    xp, steps = (await session.execute(stmt)).one()
    return xp, steps


async def last_completions(session: AsyncSession, user_id: UUID, roadmap_ids: list[UUID]) -> dict[UUID, datetime]:
    stmt = (
        select(XpEvent.step_id, func.max(XpEvent.created_at))
        .where(
            XpEvent.user_id == user_id,
            XpEvent.source == "step_complete",
            XpEvent.roadmap_id.in_(roadmap_ids),
            XpEvent.step_id.is_not(None),
        )
        .group_by(XpEvent.step_id)
    )
    return {step_id: at for step_id, at in (await session.execute(stmt)).all()}


async def locked_streak(session: AsyncSession, user_id: UUID) -> Streak:
    stmt = select(Streak).where(Streak.user_id == user_id).with_for_update()
    return (await session.execute(stmt)).scalar_one()


async def get_progress(session: AsyncSession, user_id: UUID) -> ProgressOut:
    profile = await get_profile(session, user_id)
    today = local_today(profile.timezone)
    streak = await session.get_one(Streak, user_id)
    total = await total_xp(session, user_id)
    today_xp, steps_today = await day_totals(session, user_id, today, profile.timezone)
    return ProgressOut(
        total_xp=total,
        level=level_from_xp(total),
        streak=streak_state(streak, today),
        today_xp=today_xp,
        daily_xp_goal=profile.daily_xp_goal,
        quests=[quest_progress(quest, steps_today) for quest in QUESTS],
    )


async def record_completion(
    session: AsyncSession,
    user_id: UUID,
    *,
    roadmap_id: UUID,
    step_id: UUID,
    xp: int,
    recurring: bool,
) -> CompletionOut:
    profile = await get_profile(session, user_id)
    today = local_today(profile.timezone)
    key = f"step:{step_id}:{today}" if recurring else f"step:{step_id}"
    if not await award(session, user_id, xp, "step_complete", key, roadmap_id=roadmap_id, step_id=step_id):
        raise Conflict("Step already completed")

    streak = await locked_streak(session, user_id)
    advance_streak(streak, today)

    _, steps_today = await day_totals(session, user_id, today, profile.timezone)
    completed: list[QuestOut] = []
    for quest in QUESTS:
        if steps_today >= quest.steps_target and await award(
            session, user_id, quest.xp, "quest", f"quest:{quest.code}:{today}"
        ):
            completed.append(quest_progress(quest, steps_today))

    total = await total_xp(session, user_id)
    return CompletionOut(
        xp_awarded=xp + sum(quest.xp for quest in completed),
        total_xp=total,
        level=level_from_xp(total),
        streak=streak_state(streak, today),
        quests_completed=completed,
    )


async def use_freeze(session: AsyncSession, user_id: UUID) -> StreakOut:
    profile = await get_profile(session, user_id)
    today = local_today(profile.timezone)
    streak = await locked_streak(session, user_id)
    if not streak_state(streak, today).at_risk:
        raise Conflict("Streak is not at risk")
    if streak.freezes == 0:
        raise Conflict("No freezes left")
    streak.freezes -= 1
    streak.last_active_on = today - timedelta(days=1)
    return streak_state(streak, today)


async def activity(session: AsyncSession, user_id: UUID) -> list[DayXp]:
    profile = await get_profile(session, user_id)
    first = local_today(profile.timezone) - timedelta(days=ACTIVITY_DAYS - 1)
    start, _ = day_bounds(first, profile.timezone)
    local_day = func.date(func.timezone(profile.timezone, XpEvent.created_at))
    stmt = (
        select(local_day, func.sum(XpEvent.amount))
        .where(XpEvent.user_id == user_id, XpEvent.created_at >= start)
        .group_by(local_day)
    )
    totals = dict((await session.execute(stmt)).all())
    days = [first + timedelta(days=offset) for offset in range(ACTIVITY_DAYS)]
    return [DayXp(day=day, xp=totals.get(day, 0)) for day in days]


async def league(session: AsyncSession, user_id: UUID) -> LeagueOut:
    start = week_start()
    weekly = (
        select(XpEvent.user_id, func.sum(XpEvent.amount).label("xp"))
        .where(XpEvent.created_at >= start)
        .group_by(XpEvent.user_id)
        .subquery()
    )
    stmt = (
        select(Profile.id, Profile.handle, Profile.display_name, weekly.c.xp)
        .join(weekly, weekly.c.user_id == Profile.id)
        .order_by(weekly.c.xp.desc(), Profile.id)
        .limit(LEAGUE_SIZE)
    )
    entries = [
        LeagueEntry(rank=rank, user_id=profile_id, handle=handle, display_name=name, xp=xp)
        for rank, (profile_id, handle, name, xp) in enumerate((await session.execute(stmt)).all(), start=1)
    ]
    me = next((entry for entry in entries if entry.user_id == user_id), None)
    if me is None:
        profile = await get_profile(session, user_id)
        xp = await session.scalar(select(weekly.c.xp).where(weekly.c.user_id == user_id)) or 0
        ahead = await session.scalar(select(func.count()).select_from(weekly).where(weekly.c.xp > xp)) or 0
        me = LeagueEntry(rank=ahead + 1, user_id=user_id, handle=profile.handle, display_name=profile.display_name, xp=xp)
    return LeagueOut(ends_at=start + timedelta(days=7), entries=entries, me=me)
