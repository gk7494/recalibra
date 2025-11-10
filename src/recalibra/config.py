"""Configuration loading utilities for Recalibra services."""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseModel):
    url: str = Field(default="sqlite+aiosqlite:///./recalibra.db")
    echo: bool = Field(default=False)


class BrokerSettings(BaseModel):
    url: str = Field(default="redis://localhost:6379/0")
    backend: str = Field(default="redis://localhost:6379/1")


class MonitoringSettings(BaseModel):
    window_days: int = Field(default=14, ge=1)
    rmse_threshold: float = Field(default=2.0)
    r2_threshold: float = Field(default=0.7)
    psi_threshold: float = Field(default=0.2)
    ks_pvalue_threshold: float = Field(default=0.05)


class PathsSettings(BaseModel):
    model_registry: Path = Field(default=Path("./artifacts"))
    data_root: Path = Field(default=Path("./data"))


class AppSettings(BaseSettings):
    environment: str = Field(default="local")
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    broker: BrokerSettings = Field(default_factory=BrokerSettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    paths: PathsSettings = Field(default_factory=PathsSettings)
    auth_token: Optional[str] = Field(default=None)

    model_config = SettingsConfigDict(env_prefix="RECALIBRA_", env_nested_delimiter="__")


@lru_cache
def get_settings() -> AppSettings:
    """Return cached settings instance."""
    settings = AppSettings()
    settings.paths.model_registry.mkdir(parents=True, exist_ok=True)
    settings.paths.data_root.mkdir(parents=True, exist_ok=True)
    return settings


__all__ = ["AppSettings", "get_settings"]

