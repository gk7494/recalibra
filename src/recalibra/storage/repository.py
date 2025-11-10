"""Data repository interfaces for Recalibra."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable, Sequence

from .schemas import LinkedRecordSchema, PredictionSchema, OutcomeSchema
from ..models.domain import LinkedRecord, PredictionRecord, OutcomeRecord


class PredictionRepository(ABC):
    """Abstract repository for prediction records."""

    @abstractmethod
    async def upsert_predictions(self, records: Sequence[PredictionRecord]) -> None:
        raise NotImplementedError

    @abstractmethod
    async def fetch_predictions(self, molecule_ids: Sequence[str]) -> list[PredictionRecord]:
        raise NotImplementedError


class OutcomeRepository(ABC):
    """Abstract repository for outcome records."""

    @abstractmethod
    async def upsert_outcomes(self, records: Sequence[OutcomeRecord]) -> None:
        raise NotImplementedError

    @abstractmethod
    async def fetch_outcomes(self, molecule_ids: Sequence[str]) -> list[OutcomeRecord]:
        raise NotImplementedError


class LinkedRepository(ABC):
    """Repository for linked prediction-outcome records."""

    @abstractmethod
    async def link_records(self, records: Iterable[LinkedRecord]) -> None:
        raise NotImplementedError

    @abstractmethod
    async def latest(self, limit: int = 100) -> list[LinkedRecord]:
        raise NotImplementedError


@dataclass
class InMemoryStore(PredictionRepository, OutcomeRepository, LinkedRepository):
    """Simple in-memory storage for local development & testing."""

    predictions: dict[str, PredictionSchema] = None
    outcomes: dict[str, OutcomeSchema] = None
    links: list[LinkedRecordSchema] = None

    def __post_init__(self) -> None:
        self.predictions = {}
        self.outcomes = {}
        self.links = []

    async def upsert_predictions(self, records: Sequence[PredictionRecord]) -> None:
        for record in records:
            self.predictions[record.record_id] = PredictionSchema.from_domain(record)

    async def fetch_predictions(self, molecule_ids: Sequence[str]) -> list[PredictionRecord]:
        by_molecule: dict[str, list[PredictionSchema]] = defaultdict(list)
        for schema in self.predictions.values():
            by_molecule[schema.molecule_id].append(schema)
        return [
            schema.to_domain()
            for molecule_id in molecule_ids
            for schema in by_molecule.get(molecule_id, [])
        ]

    async def upsert_outcomes(self, records: Sequence[OutcomeRecord]) -> None:
        for record in records:
            self.outcomes[record.record_id] = OutcomeSchema.from_domain(record)

    async def fetch_outcomes(self, molecule_ids: Sequence[str]) -> list[OutcomeRecord]:
        by_molecule: dict[str, list[OutcomeSchema]] = defaultdict(list)
        for schema in self.outcomes.values():
            by_molecule[schema.molecule_id].append(schema)
        return [
            schema.to_domain()
            for molecule_id in molecule_ids
            for schema in by_molecule.get(molecule_id, [])
        ]

    async def link_records(self, records: Iterable[LinkedRecord]) -> None:
        for record in records:
            self.links.append(LinkedRecordSchema.from_domain(record))

    async def latest(self, limit: int = 100) -> list[LinkedRecord]:
        return [schema.to_domain() for schema in self.links[-limit:]]


__all__ = [
    "PredictionRepository",
    "OutcomeRepository",
    "LinkedRepository",
    "InMemoryStore",
]

