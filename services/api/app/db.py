from collections.abc import AsyncIterator
from datetime import datetime
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy import DateTime
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    type_annotation_map: dict[Any, Any] = {datetime: DateTime(timezone=True)}


@lru_cache
def get_engine() -> AsyncEngine:
    return create_async_engine(get_settings().database_url, pool_pre_ping=True)


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


SessionFactory = Annotated[async_sessionmaker[AsyncSession], Depends(get_sessionmaker)]


async def get_session(factory: SessionFactory) -> AsyncIterator[AsyncSession]:
    async with factory.begin() as session:
        yield session


Session = Annotated[AsyncSession, Depends(get_session, scope="function")]
