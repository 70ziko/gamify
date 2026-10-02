from collections.abc import AsyncIterator, Callable, Iterator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic_ai import models
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.auth import AuthUser, current_user
from app.config import get_settings
from app.db import get_sessionmaker
from app.main import app

models.ALLOW_MODEL_REQUESTS = False


@pytest.fixture
async def connection() -> AsyncIterator[AsyncConnection]:
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    try:
        conn = await engine.connect()
    except (OSError, DBAPIError) as exc:
        pytest.skip(f"Postgres not reachable, run `pnpm db:start`: {exc}")
    transaction = await conn.begin()
    yield conn
    await transaction.rollback()
    await conn.close()
    await engine.dispose()


@pytest.fixture
def factory(connection: AsyncConnection) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False)


@pytest.fixture
async def client(factory: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_sessionmaker] = lambda: factory
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(factory: async_sessionmaker[AsyncSession]) -> Callable[..., object]:
    async def create(name: str, *, staff: bool = False) -> AuthUser:
        user = AuthUser(id=uuid4(), email=f"{name}@example.com", is_staff=staff)
        async with factory.begin() as session:
            await session.execute(
                text("insert into auth.users (id, email, aud, role) values (:id, :email, 'authenticated', 'authenticated')"),
                {"id": user.id, "email": user.email},
            )
        return user

    return create


@pytest.fixture
def act_as() -> Iterator[Callable[[AuthUser], None]]:
    def switch(user: AuthUser) -> None:
        app.dependency_overrides[current_user] = lambda: user

    yield switch
    app.dependency_overrides.pop(current_user, None)
