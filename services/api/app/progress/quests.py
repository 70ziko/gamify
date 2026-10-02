from dataclasses import dataclass


@dataclass(frozen=True)
class Quest:
    code: str
    title: str
    xp: int
    steps_target: int


QUESTS = (
    Quest("check_in", "Check in to a roadmap", 10, 1),
    Quest("two_steps", "Complete 2 steps", 30, 2),
    Quest("four_steps", "Complete 4 steps", 50, 4),
)
