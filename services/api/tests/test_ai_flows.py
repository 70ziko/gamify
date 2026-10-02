from typing import Any

from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.ai.flow import FlowContext
from app.ai.flows.roadmap_draft import draft_roadmap, outline_agent, unit_agent
from app.ai.flows.step_suggestions import suggest_steps, suggestion_agent
from app.ai.schemas import RoadmapBrief, StepSuggestionRequest

OUTLINE = {
    "kind": "course",
    "title": "Play piano by ear",
    "summary": "From chords to jamming.",
    "category": "music",
    "units": [
        {"title": "Chords", "summary": "Basic triads.", "step_titles": ["Major chords", "Minor chords"]},
        {"title": "Rhythm", "summary": "Keep time.", "step_titles": ["Quarter notes"]},
    ],
}


def returning(payload: dict[str, Any] | None = None) -> FunctionModel:
    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, payload or unit_from(messages))])

    return FunctionModel(respond)


def unit_from(messages: list[ModelMessage]) -> dict[str, Any]:
    title = "Rhythm" if '"Rhythm"' in str(messages[0]) else "Chords"
    return {
        "title": title,
        "summary": "",
        "steps": [
            {
                "title": f"{title} practice",
                "summary": "Practise.",
                "minutes": 15,
                "exercises": [{"kind": "quiz", "prompt": "C major?", "options": ["C E G", "C F A"], "answer": 0}],
            }
        ],
    }


async def test_draft_roadmap_outlines_then_writes_each_unit() -> None:
    stages: list[str] = []

    async def record(stage: str) -> None:
        stages.append(stage)

    ctx = FlowContext(stage=record)
    with outline_agent.override(model=returning(OUTLINE)), unit_agent.override(model=returning()):
        draft = await draft_roadmap(RoadmapBrief(goal="Play piano by ear", level="some"), ctx)

    assert stages == ["outline", "steps"]
    assert [unit.title for unit in draft.units] == ["Chords", "Rhythm"]
    assert (draft.level, draft.category, draft.total_xp) == ("some", "music", 80)
    assert ctx.usage.requests == 3


async def test_suggest_steps_uses_fast_model() -> None:
    steps = {"steps": [{"title": "Phone in another room", "minutes": 1, "exercises": [{"kind": "check", "prompt": "Done?"}]}]}
    with suggestion_agent.override(model=returning(steps)):
        result = await suggest_steps(StepSuggestionRequest(title="Deep work block"), FlowContext())
    assert result.steps[0].xp == 10
