"""Monitoring pipelines for computing metrics and drift detection."""

from __future__ import annotations

from typing import Sequence

from ..config import get_settings
from ..drift.detectors import detect_drift, DriftResult
from ..monitoring.metrics import compute_metrics, MetricSnapshot
from ..models.domain import LinkedRecord


class MonitoringPipeline:
    """Derive performance metrics and drift detection from linked records."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def run(self, records: Sequence[LinkedRecord]) -> tuple[MetricSnapshot, DriftResult]:
        metrics = compute_metrics(records)
        baseline = [record.prediction.score for record in records]
        current = [record.outcome.assay_result for record in records]
        drift = detect_drift(baseline, current)
        return metrics, drift


__all__ = ["MonitoringPipeline"]

