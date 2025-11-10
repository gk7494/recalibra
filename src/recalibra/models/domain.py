"""Domain models for Recalibra data records."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AssayContext(BaseModel):
    assay_id: str
    assay_version: str
    reagent_batch: Optional[str] = None
    instrument_id: Optional[str] = None
    operator_id: Optional[str] = None
    protocol_id: Optional[str] = None


class PredictionRecord(BaseModel):
    record_id: str
    molecule_id: str
    model_id: str
    model_version: str
    score: float
    scored_at: datetime
    context: AssayContext
    metadata: dict[str, str | float | int | bool] = Field(default_factory=dict)


class OutcomeRecord(BaseModel):
    record_id: str
    molecule_id: str
    assay_result: float
    measured_at: datetime
    context: AssayContext
    metadata: dict[str, str | float | int | bool] = Field(default_factory=dict)


class LinkedRecord(BaseModel):
    prediction: PredictionRecord
    outcome: OutcomeRecord
    delta: float = Field(..., description="Difference between prediction and outcome.")

    @classmethod
    def from_records(cls, prediction: PredictionRecord, outcome: OutcomeRecord) -> "LinkedRecord":
        if prediction.molecule_id != outcome.molecule_id:
            raise ValueError("Prediction and outcome molecule IDs do not match")
        delta = prediction.score - outcome.assay_result
        return cls(prediction=prediction, outcome=outcome, delta=delta)


__all__ = ["AssayContext", "PredictionRecord", "OutcomeRecord", "LinkedRecord"]

