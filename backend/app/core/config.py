"""Configuration settings for Recalibra"""
import os
from typing import Optional

class Settings:
    """Application settings loaded from environment variables"""
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./recalibra.db")
    
    # Benchling
    BENCHLING_API_URL: Optional[str] = os.getenv("BENCHLING_API_URL")
    BENCHLING_API_KEY: Optional[str] = os.getenv("BENCHLING_API_KEY")
    BENCHLING_ASSAY_RESULT_SCHEMA_ID: Optional[str] = os.getenv("BENCHLING_ASSAY_RESULT_SCHEMA_ID")
    
    # MOE
    MOE_CSV_PATH: Optional[str] = os.getenv("MOE_CSV_PATH", "./moe_predictions.csv")
    
    # Correction models
    CORRECTION_DIR: str = os.getenv("CORRECTION_DIR", "./corrections")
    
    # Drift detection thresholds
    KS_THRESHOLD: float = float(os.getenv("KS_THRESHOLD", "0.05"))
    PSI_THRESHOLD: float = float(os.getenv("PSI_THRESHOLD", "0.25"))
    DRIFT_CUTOFF_DAYS: int = int(os.getenv("DRIFT_CUTOFF_DAYS", "30"))

settings = Settings()
