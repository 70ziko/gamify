from pydantic import BaseModel

TITLES = ((0, "Novice"), (5, "Explorer"), (10, "Pathfinder"), (20, "Trailblazer"), (35, "Legend"))


class LevelInfo(BaseModel):
    level: int
    title: str
    into_level: int
    span: int


def xp_for_level(level: int) -> int:
    return 50 * level * level + 50 * level


def title_for_level(level: int) -> str:
    return next(title for threshold, title in reversed(TITLES) if level >= threshold)


def level_from_xp(total_xp: int) -> LevelInfo:
    level = 0
    while xp_for_level(level + 1) <= total_xp:
        level += 1
    floor = xp_for_level(level)
    return LevelInfo(
        level=level,
        title=title_for_level(level),
        into_level=total_xp - floor,
        span=xp_for_level(level + 1) - floor,
    )
