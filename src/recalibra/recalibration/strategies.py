"""Recalibration strategies for models under drift."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from sklearn.linear_model import LinearRegression

from ..models.domain import LinkedRecord


@dataclass(slots=True)
class RecalibrationResult:
    strategy: str
    artifact_path: Path
    notes: str | None = None


class RecalibrationStrategy(ABC):
    """Base class for recalibration strategies."""

    name: str

    @abstractmethod
    def run(self, records: Iterable[LinkedRecord]) -> RecalibrationResult:
        raise NotImplementedError


class CorrectionModelStrategy(RecalibrationStrategy):
    """Fits a lightweight correction layer over existing model outputs."""

    name = "correction_model"

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def run(self, records: Iterable[LinkedRecord]) -> RecalibrationResult:
        y_true = []
        y_pred = []
        for record in records:
            y_true.append(record.outcome.assay_result)
            y_pred.append(record.prediction.score)

        if not y_true:
            raise ValueError("No records supplied to correction model strategy.")

        model = LinearRegression()
        model.fit(np.array(y_pred).reshape(-1, 1), np.array(y_true))

        artifact_path = self.output_dir / "correction_model.npz"
        np.savez_compressed(
            artifact_path,
            coef=model.coef_,
            intercept=model.intercept_,
        )
        return RecalibrationResult(
            strategy=self.name,
            artifact_path=artifact_path,
            notes="Linear correction model fitted on recent drift window.",
        )


class RetrainModelStrategy(RecalibrationStrategy):
    """Placeholder strategy for triggering full retraining on partner systems."""

    name = "retrain_model"

    def __init__(self, command: str):
        self.command = command

    def run(self, records: Iterable[LinkedRecord]) -> RecalibrationResult:  # pragma: no cover
        # In production, this might trigger an Airflow DAG, send an API request, etc.
        # For now we simply record the intent.
        artifact_path = Path("retrain_trigger.txt")
        artifact_path.write_text(
            f"Triggered retraining command '{self.command}' on {len(list(records))} records."
        )
        return RecalibrationResult(
            strategy=self.name,
            artifact_path=artifact_path,
            notes="Retraining trigger recorded. Implement external orchestration.",
        )


__all__ = [
    "RecalibrationResult",
    "RecalibrationStrategy",
    "CorrectionModelStrategy",
    "RetrainModelStrategy",
]

