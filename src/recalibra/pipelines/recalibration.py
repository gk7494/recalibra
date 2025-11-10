"""Recalibration orchestration pipeline."""

from __future__ import annotations

from typing import Sequence

from ..config import get_settings
from ..models.domain import LinkedRecord
from ..recalibration.strategies import CorrectionModelStrategy, RecalibrationResult


class RecalibrationPipeline:
    """Select and run recalibration strategy based on drift outcome."""

    def __init__(self) -> None:
        settings = get_settings()
        self.strategy = CorrectionModelStrategy(settings.paths.model_registry)

    def run(self, records: Sequence[LinkedRecord]) -> RecalibrationResult:
        if not records:
            raise ValueError("No records provided for recalibration.")
        return self.strategy.run(records)


__all__ = ["RecalibrationPipeline"]

