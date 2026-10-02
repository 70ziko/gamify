from pydantic_ai import Agent

from app.ai.flow import FlowContext, ModelRole
from app.ai.schemas import StepSuggestionRequest, StepSuggestions

suggestion_agent = Agent(
    output_type=StepSuggestions,
    instructions=(
        "You suggest the next steps for a habit or roadmap. Each step is small, concrete and doable "
        "in one sitting. Do not repeat existing steps. Add a 'check' exercise when the step is a "
        "practice the learner self-reports."
    ),
)


async def suggest_steps(request: StepSuggestionRequest, ctx: FlowContext) -> StepSuggestions:
    return await ctx.ask(suggestion_agent, request.model_dump_json(), ModelRole.FAST)
