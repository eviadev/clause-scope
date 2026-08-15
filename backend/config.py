"""Configuration runtime pour ClauseScope."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite:////tmp/clausescope.db"
    auth_mode: Literal["disabled", "basic"] = "disabled"
    basic_username: str | None = None
    basic_password: str | None = None
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"
    upload_dir: str = "uploads"
    max_upload_size_bytes: int = Field(default=10 * 1024 * 1024, ge=1)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def basic_auth_configured(self) -> bool:
        return bool(self.basic_username and self.basic_password)


@lru_cache
def get_settings() -> Settings:
    return Settings()
