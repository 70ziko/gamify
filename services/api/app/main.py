"""Gamify API — thin Python service for AI + complex XP/marketplace logic.

The mobile app talks to Supabase directly for auth, CRUD, and realtime. It only
calls this service for the "smart" path: AI generation and rules that are awkward
to express in SQL. See ARCHITECTURE.md.
"""

from fastapi import FastAPI
from pydantic import BaseModel

from app.config import get_settings

app = FastAPI(title="Gamify API", version="0.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "env": get_settings().environment}


class GoalFromPromptRequest(BaseModel):
    prompt: str


class GeneratedActivity(BaseModel):
    title: str
    recurrence: str | None = None
    base_xp: int


class GoalFromPromptResponse(BaseModel):
    title: str
    category: str
    activities: list[GeneratedActivity]


@app.post("/goals/from-prompt", response_model=GoalFromPromptResponse)
def goal_from_prompt(req: GoalFromPromptRequest) -> GoalFromPromptResponse:
    """Decompose a free-text goal into a goal + activities via Claude.

    Stubbed for now so the wiring is verifiable before AI is connected. Build 5
    replaces this body with an Anthropic call (model = settings.model_authoring)
    and persists the result to Supabase with the service-role key.
    """
    return GoalFromPromptResponse(
        title=req.prompt.strip()[:80] or "New goal",
        category="custom",
        activities=[
            GeneratedActivity(title="Daily check-in", recurrence="FREQ=DAILY", base_xp=10),
        ],
    )
