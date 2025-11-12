"""Drift detection schemas"""
from pydantic import BaseModel
from typing import Optional, List


class DriftResponse(BaseModel):
    """Schema for drift detection response"""
    is_drifting: bool
    ks_statistic: Optional[float] = None
    ks_p_value: Optional[float] = None
    psi_value: Optional[float] = None
    kl_divergence: Optional[float] = None
    triggered_tests: List[str]  # Which tests detected drift
    baseline_window_size: int
    recent_window_size: int

