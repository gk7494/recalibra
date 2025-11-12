"""Metrics schemas"""
from pydantic import BaseModel
from typing import List
from datetime import datetime


class MetricsResponse(BaseModel):
    """Schema for metrics response"""
    rmse: float
    mae: float
    r_squared: float
    n_samples: int


class MetricsTimeSeriesResponse(BaseModel):
    """Schema for time-series metrics response"""
    time_buckets: List[str]  # ISO format timestamps
    rmse: List[float]
    mae: List[float]
    r_squared: List[float]
    n_samples: List[int]


