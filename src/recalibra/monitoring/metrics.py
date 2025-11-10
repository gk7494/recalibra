"""Metric computations for monitoring model performance."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

from ..models.domain import LinkedRecord


@dataclass(slots=True)
class MetricSnapshot:
    rmse: float
    mae: float
    r2: float
    count: int


def compute_metrics(records: Iterable[LinkedRecord]) -> MetricSnapshot:
    """Compute RMSE, MAE, and R² for linked records."""
    predictions = []
    outcomes = []
    for record in records:
        predictions.append(record.prediction.score)
        outcomes.append(record.outcome.assay_result)

    if not predictions:
        return MetricSnapshot(rmse=float("nan"), mae=float("nan"), r2=float("nan"), count=0)

    y_true = np.array(outcomes)
    y_pred = np.array(predictions)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))
    return MetricSnapshot(rmse=rmse, mae=mae, r2=r2, count=len(predictions))


__all__ = ["MetricSnapshot", "compute_metrics"]

