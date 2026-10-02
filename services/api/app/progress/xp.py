MAX_STEP_XP = 60


def step_xp(minutes: int) -> int:
    return min(MAX_STEP_XP, 5 * round((10 + 2 * minutes) / 5))
