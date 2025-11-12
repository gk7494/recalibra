"""Configuration settings for Recalibra"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database
    database_url: str = "sqlite:///./recalibra.db"

    # Benchling
    benchling_api_url: Optional[str] = None
    benchling_api_key: Optional[str] = None
    benchling_assay_result_schema_id: Optional[str] = None

    # MOE
    moe_csv_path: Optional[str] = "./moe_predictions.csv"

    # Correction models
    correction_dir: str = "./corrections"

    # Drift detection thresholds
    ks_threshold: float = 0.05
    psi_threshold: float = 0.25
    drift_cutoff_days: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
