from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import NotFound
from app.profiles.service import get_profile
from app.progress import service as progress
from app.progress.schemas import CompletionOut
from app.roadmaps.models import Roadmap, Step, Unit
from app.roadmaps.schemas import (
    NextStep,
    RoadmapDraft,
    RoadmapOut,
    RoadmapUpdate,
    StepBase,
    StepDetail,
    StepOut,
    UnitOut,
)


def from_draft(user_id: UUID, draft: RoadmapDraft) -> Roadmap:
    return Roadmap(
        user_id=user_id,
        kind=draft.kind,
        title=draft.title,
        summary=draft.summary,
        category=draft.category,
        level=draft.level,
        units=[
            Unit(
                position=unit_position,
                title=unit.title,
                summary=unit.summary,
                steps=[
                    Step(
                        position=step_position,
                        title=step.title,
                        summary=step.summary,
                        minutes=step.minutes,
                        xp=step.xp,
                        exercises=[exercise.model_dump() for exercise in step.exercises],
                    )
                    for step_position, step in enumerate(unit.steps)
                ],
            )
            for unit_position, unit in enumerate(draft.units)
        ],
    )


def to_draft(roadmap: Roadmap) -> RoadmapDraft:
    return RoadmapDraft.model_validate(
        {
            "kind": roadmap.kind,
            "title": roadmap.title,
            "summary": roadmap.summary,
            "category": roadmap.category,
            "level": roadmap.level,
            "units": [
                {
                    "title": unit.title,
                    "summary": unit.summary,
                    "steps": [
                        {
                            "title": step.title,
                            "summary": step.summary,
                            "minutes": step.minutes,
                            "exercises": step.exercises,
                        }
                        for step in unit.steps
                    ],
                }
                for unit in roadmap.units
            ],
        }
    )


def step_fields(step: Step) -> dict[str, Any]:
    return StepBase.model_validate(step).model_dump()


def to_out(roadmap: Roadmap, done: set[UUID]) -> RoadmapOut:
    units = [
        UnitOut(
            id=unit.id,
            position=unit.position,
            title=unit.title,
            summary=unit.summary,
            steps=[StepOut(**step_fields(step), done=step.id in done) for step in unit.steps],
        )
        for unit in roadmap.units
    ]
    steps = [(unit, step) for unit in units for step in unit.steps]
    next_step = None
    if upcoming := next(((unit, step) for unit, step in steps if not step.done), None):
        unit, step = upcoming
        next_step = NextStep(**step.model_dump(), unit_position=unit.position, unit_title=unit.title)
    return RoadmapOut(
        id=roadmap.id,
        kind=roadmap.kind,
        title=roadmap.title,
        summary=roadmap.summary,
        category=roadmap.category,
        level=roadmap.level,
        source_listing_id=roadmap.source_listing_id,
        created_at=roadmap.created_at,
        unit_count=len(units),
        total_steps=len(steps),
        done_steps=sum(step.done for _, step in steps),
        next_step=next_step,
        units=units,
    )


async def done_step_ids(session: AsyncSession, user_id: UUID, roadmaps: list[Roadmap]) -> set[UUID]:
    if not roadmaps:
        return set()
    profile = await get_profile(session, user_id)
    today_start, _ = progress.day_bounds(progress.local_today(profile.timezone), profile.timezone)
    last = await progress.last_completions(session, user_id, [roadmap.id for roadmap in roadmaps])
    habit_steps = {
        step.id for roadmap in roadmaps if roadmap.kind == "habit" for unit in roadmap.units for step in unit.steps
    }
    return {step_id for step_id, at in last.items() if step_id not in habit_steps or at >= today_start}


async def owned_roadmap(session: AsyncSession, user_id: UUID, roadmap_id: UUID) -> Roadmap:
    roadmap = await session.get(Roadmap, roadmap_id)
    if roadmap is None or roadmap.user_id != user_id or roadmap.archived:
        raise NotFound("Roadmap not found")
    return roadmap


async def create_roadmap(
    session: AsyncSession,
    user_id: UUID,
    draft: RoadmapDraft,
    *,
    source_listing_id: UUID | None = None,
    source_version: int | None = None,
) -> Roadmap:
    roadmap = from_draft(user_id, draft)
    roadmap.source_listing_id = source_listing_id
    roadmap.source_version = source_version
    session.add(roadmap)
    await session.flush()
    return roadmap


async def list_roadmaps(session: AsyncSession, user_id: UUID) -> list[RoadmapOut]:
    stmt = (
        select(Roadmap)
        .where(Roadmap.user_id == user_id, Roadmap.archived.is_(False))
        .order_by(Roadmap.created_at.desc())
    )
    roadmaps = list((await session.scalars(stmt)).all())
    done = await done_step_ids(session, user_id, roadmaps)
    return [to_out(roadmap, done) for roadmap in roadmaps]


async def get_roadmap(session: AsyncSession, user_id: UUID, roadmap_id: UUID) -> RoadmapOut:
    roadmap = await owned_roadmap(session, user_id, roadmap_id)
    return to_out(roadmap, await done_step_ids(session, user_id, [roadmap]))


async def update_roadmap(
    session: AsyncSession, user_id: UUID, roadmap_id: UUID, changes: RoadmapUpdate
) -> RoadmapOut:
    roadmap = await owned_roadmap(session, user_id, roadmap_id)
    for field, value in changes.model_dump(exclude_none=True).items():
        setattr(roadmap, field, value)
    await session.flush()
    return to_out(roadmap, await done_step_ids(session, user_id, [roadmap]))


async def archive_roadmap(session: AsyncSession, user_id: UUID, roadmap_id: UUID) -> None:
    roadmap = await owned_roadmap(session, user_id, roadmap_id)
    roadmap.archived = True


async def owned_step(session: AsyncSession, user_id: UUID, step_id: UUID) -> tuple[Step, UUID, str]:
    stmt = (
        select(Step, Roadmap.id, Roadmap.kind)
        .join(Unit, Unit.id == Step.unit_id)
        .join(Roadmap, Roadmap.id == Unit.roadmap_id)
        .where(Step.id == step_id, Roadmap.user_id == user_id, Roadmap.archived.is_(False))
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        raise NotFound("Step not found")
    step, roadmap_id, kind = row
    return step, roadmap_id, kind


async def get_step(session: AsyncSession, user_id: UUID, step_id: UUID) -> StepDetail:
    step, roadmap_id, _ = await owned_step(session, user_id, step_id)
    return StepDetail.model_validate({**step_fields(step), "roadmap_id": roadmap_id, "exercises": step.exercises})


async def complete_step(session: AsyncSession, user_id: UUID, step_id: UUID) -> CompletionOut:
    step, roadmap_id, kind = await owned_step(session, user_id, step_id)
    return await progress.record_completion(
        session, user_id, roadmap_id=roadmap_id, step_id=step.id, xp=step.xp, recurring=kind == "habit"
    )
