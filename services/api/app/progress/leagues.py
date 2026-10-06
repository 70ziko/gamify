TIERS = ("Quartz", "Topaz", "Amethyst", "Sapphire", "Emerald", "Ruby", "Diamond")
LEAGUE_SIZE = 20
PROMOTE = 7
DEMOTE = 5


def zones(tier: int, size: int) -> tuple[int, int]:
    # A cohort that hasn't filled up moves fewer people, so early weeks with few users don't inflate tiers.
    promote = size * PROMOTE // LEAGUE_SIZE if tier < len(TIERS) - 1 else 0
    demote = size * DEMOTE // LEAGUE_SIZE if tier > 0 else 0
    return promote, demote


def outcome_for(tier: int, rank: int, size: int, xp: int) -> str:
    promote, demote = zones(tier, size)
    if rank <= promote and xp > 0:
        return "promoted"
    if rank > size - demote:
        return "demoted"
    return "stayed"


def next_tier(tier: int, outcome: str) -> int:
    return tier + {"promoted": 1, "demoted": -1}.get(outcome, 0)
