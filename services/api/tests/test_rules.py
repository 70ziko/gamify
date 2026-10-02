from datetime import UTC, date, datetime

import pytest
from pydantic import ValidationError

from app.progress.levels import level_from_xp, xp_for_level
from app.progress.models import Streak
from app.progress.quests import QUESTS
from app.progress.service import advance_streak, day_bounds, local_today, quest_progress, streak_state
from app.progress.xp import MAX_STEP_XP, step_xp
from app.roadmaps.schemas import QuizExercise, RoadmapDraft

TODAY = date(2026, 9, 29)


def streak(current: int, last: date | None, freezes: int = 2) -> Streak:
    return Streak(current=current, longest=current, freezes=freezes, last_active_on=last)


def test_level_curve_matches_shared_package() -> None:
    assert [xp_for_level(level) for level in range(4)] == [0, 100, 300, 600]
    info = level_from_xp(350)
    assert (info.level, info.into_level, info.span, info.title) == (2, 50, 300, "Novice")
    assert level_from_xp(xp_for_level(10)).title == "Pathfinder"


def test_step_xp_is_rounded_and_capped() -> None:
    assert step_xp(15) == 40
    assert step_xp(1) == 10
    assert step_xp(240) == MAX_STEP_XP


def test_streak_advances_once_per_day() -> None:
    s = streak(3, date(2026, 9, 28))
    advance_streak(s, TODAY)
    advance_streak(s, TODAY)
    assert (s.current, s.longest, s.last_active_on) == (4, 4, TODAY)


def test_streak_resets_after_a_gap() -> None:
    s = streak(5, date(2026, 9, 26))
    advance_streak(s, TODAY)
    assert (s.current, s.longest) == (1, 5)


def test_streak_state_flags_risk_when_yesterday_was_missed() -> None:
    at_risk = streak_state(streak(21, date(2026, 9, 27)), TODAY)
    assert (at_risk.current, at_risk.at_risk, at_risk.active_today) == (21, True, False)
    broken = streak_state(streak(21, date(2026, 9, 20)), TODAY)
    assert (broken.current, broken.at_risk) == (0, False)
    active = streak_state(streak(4, TODAY), TODAY)
    assert (active.current, active.active_today) == (4, True)


def test_local_day_follows_user_timezone() -> None:
    now = datetime(2026, 9, 29, 23, 30, tzinfo=UTC)
    assert local_today("UTC", now) == TODAY
    assert local_today("Europe/Warsaw", now) == date(2026, 9, 30)
    start, end = day_bounds(TODAY, "Europe/Warsaw")
    assert (end - start).total_seconds() == 86400
    assert start.astimezone(UTC) == datetime(2026, 9, 28, 22, 0, tzinfo=UTC)


def test_quest_progress_is_capped_at_target() -> None:
    progress = [quest_progress(quest, 3) for quest in QUESTS]
    assert [(q.progress, q.done) for q in progress] == [(1, True), (2, True), (3, False)]


def test_quiz_answer_must_index_options() -> None:
    with pytest.raises(ValidationError):
        QuizExercise(kind="quiz", prompt="?", options=["a", "b"], answer=2)


def test_draft_xp_is_computed_not_accepted() -> None:
    draft = RoadmapDraft.model_validate(
        {
            "kind": "course",
            "title": "Piano",
            "category": "music",
            "units": [{"title": "Chords", "steps": [{"title": "Major chords", "minutes": 15, "xp": 9999}]}],
        }
    )
    assert draft.units[0].steps[0].xp == 40
    assert draft.total_xp == 40
    assert draft.model_dump()["total_xp"] == 40
