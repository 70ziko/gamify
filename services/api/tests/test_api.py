from collections.abc import Callable
from datetime import timedelta
from typing import Any
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.flows.roadmap_draft import outline_agent, unit_agent
from app.ai.flows.step_suggestions import suggestion_agent
from app.ai.runner import FREE_DAILY_LIMITS
from app.auth import AuthUser
from app.progress.leagues import LEAGUE_SIZE
from app.progress.models import League, LeagueMember, XpEvent
from app.progress.service import week_start
from tests.test_ai_flows import OUTLINE, returning

pytestmark = pytest.mark.db

DRAFT = {
    "kind": "course",
    "title": "Intro to Piano",
    "summary": "Chords and rhythm",
    "category": "music",
    "units": [
        {
            "title": "Chords",
            "steps": [
                {"title": "Major chords", "minutes": 15, "exercises": [{"kind": "check", "prompt": "Play C"}]},
                {"title": "Minor chords", "minutes": 15},
            ],
        },
        {"title": "Rhythm", "steps": [{"title": "Quarter notes", "minutes": 5}]},
    ],
}


@pytest.fixture
async def alice(make_user: Callable[..., Any], act_as: Callable[[AuthUser], None]) -> AuthUser:
    user = await make_user("alice")
    act_as(user)
    return user


async def create_roadmap(client: AsyncClient, draft: dict[str, Any] = DRAFT) -> dict[str, Any]:
    response = await client.post("/roadmaps", json=draft)
    assert response.status_code == 201, response.text
    return response.json()


async def test_profile_onboarding(client: AsyncClient, alice: AuthUser, make_user: Callable[..., Any], act_as) -> None:
    me = (await client.get("/me")).json()
    assert (me["display_name"], me["timezone"], me["daily_xp_goal"]) == ("alice", "UTC", 30)

    update = {"handle": "alice", "interests": ["music", "coding"], "daily_xp_goal": 60, "timezone": "Europe/Warsaw"}
    assert (await client.patch("/me", json=update)).json()["interests"] == ["music", "coding"]
    assert (await client.patch("/me", json={"daily_xp_goal": None})).status_code == 422
    assert (await client.patch("/me", json={"timezone": "Mars/Base"})).status_code == 422

    act_as(await make_user("bob"))
    assert (await client.patch("/me", json={"handle": "alice"})).status_code == 409
    assert (await client.get("/profiles/alice")).json()["display_name"] == "alice"


async def test_completing_steps_awards_xp_once_and_grants_quests(client: AsyncClient, alice: AuthUser) -> None:
    roadmap = await create_roadmap(client)
    assert roadmap["total_steps"] == 3
    first, second = roadmap["units"][0]["steps"]
    assert roadmap["next_step"]["id"] == first["id"]

    completion = (await client.post(f"/steps/{first['id']}/complete")).json()
    assert completion["xp_awarded"] == 40 + 10
    assert [quest["code"] for quest in completion["quests_completed"]] == ["check_in"]
    assert completion["streak"]["current"] == 1
    assert (await client.post(f"/steps/{first['id']}/complete")).status_code == 409

    completion = (await client.post(f"/steps/{second['id']}/complete")).json()
    assert completion["xp_awarded"] == 40 + 30
    assert completion["total_xp"] == 120

    summary = (await client.get("/roadmaps")).json()[0]
    assert (summary["done_steps"], summary["next_step"]["unit_title"]) == (2, "Rhythm")
    assert "units" not in summary

    progress = (await client.get("/me/progress")).json()
    assert (progress["total_xp"], progress["today_xp"], progress["level"]["level"]) == (120, 120, 1)
    assert [quest["done"] for quest in progress["quests"]] == [True, True, False]


async def test_step_detail_and_ownership(client: AsyncClient, alice: AuthUser, make_user, act_as) -> None:
    roadmap = await create_roadmap(client)
    step_id = roadmap["units"][0]["steps"][0]["id"]
    step = (await client.get(f"/steps/{step_id}")).json()
    assert step["exercises"] == [{"kind": "check", "prompt": "Play C"}]

    act_as(await make_user("mallory"))
    assert (await client.get(f"/roadmaps/{roadmap['id']}")).status_code == 404
    assert (await client.post(f"/steps/{step_id}/complete")).status_code == 404


async def test_rename_and_archive(client: AsyncClient, alice: AuthUser) -> None:
    roadmap = await create_roadmap(client)
    renamed = (await client.patch(f"/roadmaps/{roadmap['id']}", json={"title": "Piano", "summary": None})).json()
    assert (renamed["title"], renamed["summary"]) == ("Piano", "Chords and rhythm")
    assert (await client.delete(f"/roadmaps/{roadmap['id']}")).status_code == 204
    assert (await client.get("/roadmaps")).json() == []


async def test_habit_steps_are_done_for_today(client: AsyncClient, alice: AuthUser) -> None:
    habit = await create_roadmap(client, {**DRAFT, "kind": "habit"})
    step_id = habit["units"][0]["steps"][0]["id"]
    await client.post(f"/steps/{step_id}/complete")
    roadmap = (await client.get(f"/roadmaps/{habit['id']}")).json()
    assert roadmap["units"][0]["steps"][0]["done"] is True


async def test_streak_freeze(
    client: AsyncClient, alice: AuthUser, factory: async_sessionmaker[AsyncSession]
) -> None:
    async with factory.begin() as session:
        await session.execute(
            text("update streaks set current = 21, last_active_on = current_date - 2 where user_id = :id"),
            {"id": alice.id},
        )
    assert (await client.get("/me/progress")).json()["streak"]["at_risk"] is True

    streak = (await client.post("/me/streak/freeze")).json()
    assert (streak["current"], streak["freezes"], streak["at_risk"]) == (21, 1, False)
    assert (await client.post("/me/streak/freeze")).status_code == 409


async def test_weekly_league_and_activity(
    client: AsyncClient, alice: AuthUser, make_user: Callable[..., Any], act_as: Callable[[AuthUser], None]
) -> None:
    first, second = (await create_roadmap(client))["units"][0]["steps"]
    await client.post(f"/steps/{first['id']}/complete")
    activity = (await client.get("/me/activity")).json()
    assert (len(activity), activity[-1]["xp"], activity[0]["xp"]) == (28, 50, 0)

    act_as(await make_user("bob"))
    assert (await client.get("/me/league")).json()["me"] is None
    first, second = (await create_roadmap(client))["units"][0]["steps"]
    for step in (first, second):
        await client.post(f"/steps/{step['id']}/complete")
    bob = (await client.get("/me/league")).json()["me"]

    act_as(alice)
    league = (await client.get("/me/league")).json()
    assert (league["tier_name"], league["me"]["xp"], bob["xp"]) == ("Quartz", 50, 120)
    assert league["me"]["rank"] > bob["rank"]
    ranked = [entry["display_name"] for entry in league["entries"] if entry["display_name"] in ("alice", "bob")]
    assert ranked == ["bob", "alice"]


async def test_league_rollover(
    client: AsyncClient,
    make_user: Callable[..., Any],
    act_as: Callable[[AuthUser], None],
    factory: async_sessionmaker[AsyncSession],
) -> None:
    ann, ben, cat, dan = [await make_user(name) for name in ("ann", "ben", "cat", "dan")]
    last_week = week_start() - timedelta(days=7)
    async with factory.begin() as session:
        league = League(id=uuid4(), week_start=last_week.date(), tier=1)
        session.add(league)
        await session.flush()
        for user, xp in ((ann, 300), (ben, 200), (cat, 100), (dan, 50)):
            session.add(LeagueMember(league_id=league.id, week_start=last_week.date(), user_id=user.id))
            session.add(
                XpEvent(user_id=user.id, amount=xp, source="adjustment", idempotency_key="seed", created_at=last_week)
            )

    act_as(ann)
    assert ((await client.get("/me/league")).json()["tier_name"]) == "Amethyst"
    act_as(dan)
    assert ((await client.get("/me/league")).json()["tier_name"]) == "Quartz"
    async with factory.begin() as session:
        outcomes = await session.execute(
            text("select user_id, outcome from league_members where league_id = :id"), {"id": league.id}
        )
    assert dict(outcomes.all()) == {ann.id: "promoted", ben.id: "stayed", cat.id: "stayed", dan.id: "demoted"}

    act_as(ann)
    step = (await create_roadmap(client))["units"][0]["steps"][0]
    await client.post(f"/steps/{step['id']}/complete")
    current = (await client.get("/me/league")).json()
    assert (current["tier"], current["me"]["xp"], current["promote"]) == (2, 50, 0)


async def test_full_league_opens_a_new_cohort(
    client: AsyncClient,
    alice: AuthUser,
    make_user: Callable[..., Any],
    factory: async_sessionmaker[AsyncSession],
) -> None:
    members = [await make_user(f"member{index}") for index in range(LEAGUE_SIZE)]
    week = week_start().date()
    async with factory.begin() as session:
        full = League(id=uuid4(), week_start=week, tier=0)
        session.add(full)
        await session.flush()
        session.add_all(LeagueMember(league_id=full.id, week_start=week, user_id=member.id) for member in members)

    step = (await create_roadmap(client))["units"][0]["steps"][0]
    await client.post(f"/steps/{step['id']}/complete")
    entries = (await client.get("/me/league")).json()["entries"]
    assert str(alice.id) in {entry["user_id"] for entry in entries}
    assert not {entry["user_id"] for entry in entries} & {str(member.id) for member in members}


async def test_league_opt_out(client: AsyncClient, alice: AuthUser) -> None:
    assert (await client.patch("/me", json={"league_opt_in": False})).json()["league_opt_in"] is False
    assert (await client.patch("/me", json={"league_opt_in": None})).status_code == 422
    step = (await create_roadmap(client))["units"][0]["steps"][0]
    await client.post(f"/steps/{step['id']}/complete")
    league = (await client.get("/me/league")).json()
    assert (league["me"], league["entries"]) == (None, [])


async def test_marketplace_publish_install_review(
    client: AsyncClient, alice: AuthUser, make_user: Callable[..., Any], act_as: Callable[[AuthUser], None]
) -> None:
    roadmap = await create_roadmap(client)
    listing = (await client.post("/marketplace/listings", json={"roadmap_id": roadmap["id"]})).json()
    assert (listing["title"], listing["author"]["display_name"]) == ("Intro to Piano", "alice")
    assert (await client.post("/marketplace/listings", json={"roadmap_id": roadmap["id"]})).status_code == 409
    assert (await client.put(f"/marketplace/listings/{listing['id']}/review", json={"rating": 5})).status_code == 403

    bob = await make_user("bob")
    act_as(bob)
    found = (await client.get("/marketplace/listings", params={"q": "piano", "category": "music"})).json()
    assert [item["id"] for item in found] == [listing["id"]]
    assert (await client.put(f"/marketplace/listings/{listing['id']}/review", json={"rating": 4})).status_code == 403

    installed = (await client.post(f"/marketplace/listings/{listing['id']}/install")).json()
    assert installed["source_listing_id"] == listing["id"]
    again = (await client.post(f"/marketplace/listings/{listing['id']}/install")).json()
    assert again["id"] == installed["id"]

    await client.post(f"/steps/{installed['units'][0]['steps'][0]['id']}/complete")
    review = await client.put(f"/marketplace/listings/{listing['id']}/review", json={"rating": 4, "body": "Nice"})
    assert review.status_code == 200

    detail = (await client.get(f"/marketplace/listings/{listing['id']}")).json()
    assert (detail["installs"], detail["rating_avg"], detail["rating_count"]) == (1, 4.0, 1)
    assert [(entry["display_name"], entry["xp"]) for entry in detail["leaderboard"]] == [("bob", 40)]
    assert detail["content"]["units"][0]["title"] == "Chords"

    assert (await client.patch(f"/marketplace/listings/{listing['id']}", json={"is_official": True})).status_code == 403
    act_as(await make_user("staff", staff=True))
    official = await client.patch(f"/marketplace/listings/{listing['id']}", json={"is_official": True})
    assert official.json()["is_official"] is True

    act_as(alice)
    await client.patch(f"/roadmaps/{roadmap['id']}", json={"title": "Intro to Piano v2"})
    version = (await client.post(f"/marketplace/listings/{listing['id']}/versions")).json()
    assert (version["latest_version"], version["title"]) == (2, "Intro to Piano v2")


async def test_ai_roadmap_draft_runs_in_background_and_respects_quota(client: AsyncClient, alice: AuthUser) -> None:
    brief = {"goal": "Play piano by ear", "weeks": 12, "minutes_per_day": 15}
    with outline_agent.override(model=returning(OUTLINE)), unit_agent.override(model=returning()):
        started = await client.post("/ai/roadmap-drafts", json=brief)
        assert started.status_code == 202
        run = (await client.get(f"/ai/roadmap-drafts/{started.json()['id']}")).json()
        assert (run["status"], run["stage"]) == ("succeeded", "steps")
        assert (await client.post("/roadmaps", json=run["draft"])).status_code == 201

        for _ in range(FREE_DAILY_LIMITS["roadmap_draft"] - 1):
            await client.post("/ai/roadmap-drafts", json=brief)
        assert (await client.post("/ai/roadmap-drafts", json=brief)).status_code == 429


async def test_ai_step_suggestions(client: AsyncClient, alice: AuthUser) -> None:
    steps = {"steps": [{"title": "Phone in another room", "minutes": 1}]}
    with suggestion_agent.override(model=returning(steps)):
        response = await client.post("/ai/step-suggestions", json={"title": "Deep work block"})
    assert response.json()["steps"][0]["xp"] == 10
