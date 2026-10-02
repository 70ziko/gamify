from uuid import UUID

from fastapi import APIRouter, status

from app.auth import CurrentUser
from app.db import Session
from app.progress.schemas import CompletionOut
from app.roadmaps import service
from app.roadmaps.schemas import RoadmapDraft, RoadmapOut, RoadmapSummary, RoadmapUpdate, StepDetail

router = APIRouter(tags=["roadmaps"])


@router.get("/roadmaps")
async def list_roadmaps(user: CurrentUser, session: Session) -> list[RoadmapSummary]:
    return await service.list_roadmaps(session, user.id)


@router.post("/roadmaps", status_code=status.HTTP_201_CREATED)
async def create_roadmap(draft: RoadmapDraft, user: CurrentUser, session: Session) -> RoadmapOut:
    roadmap = await service.create_roadmap(session, user.id, draft)
    return service.to_out(roadmap, set())


@router.get("/roadmaps/{roadmap_id}")
async def read_roadmap(roadmap_id: UUID, user: CurrentUser, session: Session) -> RoadmapOut:
    return await service.get_roadmap(session, user.id, roadmap_id)


@router.patch("/roadmaps/{roadmap_id}")
async def update_roadmap(roadmap_id: UUID, changes: RoadmapUpdate, user: CurrentUser, session: Session) -> RoadmapOut:
    return await service.update_roadmap(session, user.id, roadmap_id, changes)


@router.delete("/roadmaps/{roadmap_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_roadmap(roadmap_id: UUID, user: CurrentUser, session: Session) -> None:
    await service.archive_roadmap(session, user.id, roadmap_id)


@router.get("/steps/{step_id}")
async def read_step(step_id: UUID, user: CurrentUser, session: Session) -> StepDetail:
    return await service.get_step(session, user.id, step_id)


@router.post("/steps/{step_id}/complete")
async def complete_step(step_id: UUID, user: CurrentUser, session: Session) -> CompletionOut:
    return await service.complete_step(session, user.id, step_id)
