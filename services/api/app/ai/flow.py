from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.usage import RunUsage

from app.config import get_settings


class ModelRole(StrEnum):
    AUTHORING = "authoring"
    FAST = "fast"


def model_for(role: ModelRole) -> str:
    settings = get_settings()
    return settings.ai_model_authoring if role is ModelRole.AUTHORING else settings.ai_model_fast


async def ignore_stage(_: str) -> None:
    return None


@dataclass
class FlowContext:
    stage: Callable[[str], Awaitable[None]] = ignore_stage
    usage: RunUsage = field(default_factory=RunUsage)

    async def ask[T](self, agent: Agent[None, T], prompt: str, role: ModelRole) -> T:
        result = await agent.run(prompt, model=model_for(role))
        self.usage.incr(result.usage)
        return result.output


type Flow = Callable[[Any, FlowContext], Awaitable[BaseModel]]
