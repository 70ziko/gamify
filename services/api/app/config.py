from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
    supabase_url: str = "http://127.0.0.1:54321"

    ai_model_authoring: str = "anthropic:claude-opus-5-5"
    ai_model_fast: str = "anthropic:claude-haiku-4-5-20251001"
    ai_free_daily_drafts: int = 3

    @property
    def auth_issuer(self) -> str:
        return f"{self.supabase_url}/auth/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
