"""Runtime configuration, loaded from environment / .env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase — the API talks to Postgres with the service-role key (bypasses RLS).
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Anthropic Claude
    anthropic_api_key: str = ""
    model_authoring: str = "claude-opus-4-8"
    model_fast: str = "claude-haiku-4-5-20251001"

    environment: str = "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
