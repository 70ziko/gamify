import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.flow import Flow, FlowContext
from app.ai.models import AiRun
from app.errors import NotFound, QuotaExceeded
from app.profiles.service import get_profile

logger = logging.getLogger(__name__)

FREE_DAILY_LIMITS = {"roadmap_draft": 3, "step_suggestions": 30}
RUN_TIMEOUT = timedelta(minutes=10)


async def check_quota(session: AsyncSession, user_id: UUID, flow: str) -> None:
    profile = await get_profile(session, user_id)
    if profile.plan == "plus":
        return
    used = await session.scalar(
        select(func.count()).where(
            AiRun.user_id == user_id,
            AiRun.flow == flow,
            AiRun.status != "failed",
            AiRun.created_at >= datetime.now(UTC) - timedelta(days=1),
        )
    )
    if (used or 0) >= FREE_DAILY_LIMITS[flow]:
        raise QuotaExceeded("Daily AI limit reached")


async def start_run(session: AsyncSession, user_id: UUID, flow: str, data: BaseModel) -> AiRun:
    await check_quota(session, user_id, flow)
    run = AiRun(user_id=user_id, flow=flow, input=data.model_dump(mode="json"))
    session.add(run)
    await session.flush()
    return run


def finish_values(ctx: FlowContext, output: BaseModel | None, error: str | None) -> dict[str, Any]:
    return {
        "status": "failed" if error else "succeeded",
        "output": output.model_dump(mode="json") if output else None,
        "error": error,
        "input_tokens": ctx.usage.input_tokens,
        "output_tokens": ctx.usage.output_tokens,
        "finished_at": datetime.now(UTC),
    }


async def execute_run(factory: async_sessionmaker[AsyncSession], run_id: UUID, flow: Flow, data: BaseModel) -> None:
    running = (AiRun.id == run_id, AiRun.status == "running")

    async def stage(name: str) -> None:
        async with factory.begin() as session:
            await session.execute(update(AiRun).where(*running).values(stage=name))

    ctx = FlowContext(stage=stage)
    try:
        values = finish_values(ctx, await flow(data, ctx), None)
    except Exception as exc:
        logger.exception("AI run %s failed", run_id)
        values = finish_values(ctx, None, repr(exc))
    async with factory.begin() as session:
        await session.execute(update(AiRun).where(*running).values(**values))


async def run_inline(session: AsyncSession, user_id: UUID, flow_name: str, flow: Flow, data: BaseModel) -> Any:
    run = await start_run(session, user_id, flow_name, data)
    ctx = FlowContext()
    output = await flow(data, ctx)
    for field, value in finish_values(ctx, output, None).items():
        setattr(run, field, value)
    return output


async def get_run(session: AsyncSession, user_id: UUID, run_id: UUID, flow: str) -> AiRun:
    run = await session.get(AiRun, run_id)
    if run is None or run.user_id != user_id or run.flow != flow:
        raise NotFound("Run not found")
    if run.status == "running" and run.created_at < datetime.now(UTC) - RUN_TIMEOUT:
        run.status = "failed"
        run.error = "Timed out"
        run.finished_at = datetime.now(UTC)
    return run


async def cancel_run(session: AsyncSession, user_id: UUID, run_id: UUID, flow: str) -> None:
    run = await get_run(session, user_id, run_id, flow)
    if run.status == "running":
        run.status = "cancelled"
        run.finished_at = datetime.now(UTC)
