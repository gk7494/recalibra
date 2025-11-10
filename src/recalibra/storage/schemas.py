"""Persistence-friendly schemas bridging domain models and storage layer."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any

from ..models.domain import AssayContext, LinkedRecord, OutcomeRecord, PredictionRecord


@dataclass(slots=True)
class AssayContextSchema:
    assay_id: str
    assay_version: str
    reagent_batch: str | None
    instrument_id: str | None
    operator_id: str | None
    protocol_id: str | None

    @classmethod
    def from_domain(cls, context: AssayContext) -> "AssayContextSchema":
        return cls(**context.model_dump())

    def to_domain(self) -> AssayContext:
        return AssayContext(**asdict(self))


@dataclass(slots=True)
class PredictionSchema:
    record_id: str
    molecule_id: str
    model_id: str
    model_version: str
    score: float
    scored_at: datetime
    context: AssayContextSchema
    metadata: dict[str, Any]

    @classmethod
    def from_domain(cls, record: PredictionRecord) -> "PredictionSchema":
        return cls(
            record_id=record.record_id,
            molecule_id=record.molecule_id,
            model_id=record.model_id,
            model_version=record.model_version,
            score=record.score,
            scored_at=record.scored_at,
            context=AssayContextSchema.from_domain(record.context),
            metadata=record.metadata,
        )

    def to_domain(self) -> PredictionRecord:
        return PredictionRecord(
            record_id=self.record_id,
            molecule_id=self.molecule_id,
            model_id=self.model_id,
            model_version=self.model_version,
            score=self.score,
            scored_at=self.scored_at,
            context=self.context.to_domain(),
            metadata=self.metadata,
        )


@dataclass(slots=True)
class OutcomeSchema:
    record_id: str
    molecule_id: str
    assay_result: float
    measured_at: datetime
    context: AssayContextSchema
    metadata: dict[str, Any]

    @classmethod
    def from_domain(cls, record: OutcomeRecord) -> "OutcomeSchema":
        return cls(
            record_id=record.record_id,
            molecule_id=record.molecule_id,
            assay_result=record.assay_result,
            measured_at=record.measured_at,
            context=AssayContextSchema.from_domain(record.context),
            metadata=record.metadata,
        )

    def to_domain(self) -> OutcomeRecord:
        return OutcomeRecord(
            record_id=self.record_id,
            molecule_id=self.molecule_id,
            assay_result=self.assay_result,
            measured_at=self.measured_at,
            context=self.context.to_domain(),
            metadata=self.metadata,
        )


@dataclass(slots=True)
class LinkedRecordSchema:
    prediction: PredictionSchema
    outcome: OutcomeSchema
    delta: float

    @classmethod
    def from_domain(cls, record: LinkedRecord) -> "LinkedRecordSchema":
        return cls(
            prediction=PredictionSchema.from_domain(record.prediction),
            outcome=OutcomeSchema.from_domain(record.outcome),
            delta=record.delta,
        )

    def to_domain(self) -> LinkedRecord:
        return LinkedRecord(
            prediction=self.prediction.to_domain(),
            outcome=self.outcome.to_domain(),
            delta=self.delta,
        )


__all__ = [
    "AssayContextSchema",
    "PredictionSchema",
    "OutcomeSchema",
    "LinkedRecordSchema",
]

