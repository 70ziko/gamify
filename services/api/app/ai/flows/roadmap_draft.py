import asyncio

from pydantic import BaseModel, Field
from pydantic_ai import Agent

from app.ai.flow import FlowContext, ModelRole
from app.ai.schemas import RoadmapBrief
from app.roadmaps.schemas import Category, RoadmapDraft, RoadmapKind, UnitDraft


class UnitOutline(BaseModel):
    title: str
    summary: str
    step_titles: list[str] = Field(min_length=1, max_length=30)


class Outline(BaseModel):
    kind: RoadmapKind
    title: str
    summary: str
    category: Category
    units: list[UnitOutline] = Field(min_length=1, max_length=20)


outline_agent = Agent(
    output_type=Outline,
    instructions=(
        "You design gamified learning roadmaps. Turn the learner's goal into a roadmap of units, "
        "each with short, concrete step titles. Size it to the timeframe and daily minutes: roughly "
        "one step per practice day, grouped into 4-8 units. Use kind 'habit' only for a single daily "
        "routine, otherwise 'course'. Match the learner's starting level."
    ),
)

unit_agent = Agent(
    output_type=UnitDraft,
    instructions=(
        "You write one unit of a gamified roadmap. Keep the given unit and step titles in order. "
        "For each step write a one-sentence summary, estimate minutes within the daily budget, and "
        "add 1-3 exercises: 'quiz' for knowledge checks (answer is the index of the correct option), "
        "'check' for practice the learner self-reports, 'timer' for timed practice."
    ),
)


def unit_prompt(brief: RoadmapBrief, outline: Outline, unit: UnitOutline) -> str:
    return (
        f"Roadmap: {outline.title} ({outline.summary})\n"
        f"Learner: {brief.level}, {brief.minutes_per_day} minutes a day\n"
        f"Unit: {unit.model_dump_json()}"
    )


async def draft_roadmap(brief: RoadmapBrief, ctx: FlowContext) -> RoadmapDraft:
    await ctx.stage("outline")
    outline = await ctx.ask(outline_agent, brief.model_dump_json(), ModelRole.AUTHORING)
    await ctx.stage("steps")
    units = await asyncio.gather(
        *(ctx.ask(unit_agent, unit_prompt(brief, outline, unit), ModelRole.AUTHORING) for unit in outline.units)
    )
    return RoadmapDraft(
        kind=outline.kind,
        title=outline.title,
        summary=outline.summary,
        category=outline.category,
        level=brief.level,
        units=list(units),
    )
