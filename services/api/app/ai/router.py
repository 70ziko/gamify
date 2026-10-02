from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, status

from app.ai import runner
from app.ai.flows.roadmap_draft import draft_roadmap
from app.ai.flows.step_suggestions import suggest_steps
from app.ai.models import AiRun
from app.ai.schemas import RoadmapBrief, RoadmapDraftRun, StepSuggestionRequest, StepSuggestions
from app.auth import CurrentUser
from app.db import Session, SessionFactory

router = APIRouter(prefix="/ai", tags=["ai"])


def draft_run_out(run: AiRun) -> RoadmapDraftRun:
    return RoadmapDraftRun.model_validate(
        {"id": run.id, "status": run.status, "stage": run.stage, "draft": run.output, "created_at": run.created_at}
    )


@router.post("/roadmap-drafts", status_code=status.HTTP_202_ACCEPTED)
async def start_roadmap_draft(
    brief: RoadmapBrief, user: CurrentUser, session: Session, factory: SessionFactory, background: BackgroundTasks
) -> RoadmapDraftRun:
    run = await runner.start_run(session, user.id, "roadmap_draft", brief)
    background.add_task(runner.execute_run, factory, run.id, draft_roadmap, brief)
    return draft_run_out(run)


@router.get("/roadmap-drafts/{run_id}")
async def read_roadmap_draft(run_id: UUID, user: CurrentUser, session: Session) -> RoadmapDraftRun:
    return draft_run_out(await runner.get_run(session, user.id, run_id, "roadmap_draft"))


@router.delete("/roadmap-drafts/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_roadmap_draft(run_id: UUID, user: CurrentUser, session: Session) -> None:
    await runner.cancel_run(session, user.id, run_id, "roadmap_draft")


@router.post("/step-suggestions")
async def create_step_suggestions(
    request: StepSuggestionRequest, user: CurrentUser, session: Session
) -> StepSuggestions:
    return await runner.run_inline(session, user.id, "step_suggestions", suggest_steps, request)
