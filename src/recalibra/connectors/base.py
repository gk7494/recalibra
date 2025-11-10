"""Base connector interfaces for external systems."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterable, Sequence

from ..models.domain import PredictionRecord, OutcomeRecord


class PredictionConnector(ABC):
    """Abstract connector for fetching model predictions from partner systems."""

    name: str

    @abstractmethod
    async def fetch_predictions(self, limit: int = 1000) -> Sequence[PredictionRecord]:
        raise NotImplementedError


class OutcomeConnector(ABC):
    """Abstract connector for fetching experimental outcomes."""

    name: str

    @abstractmethod
    async def fetch_outcomes(self, limit: int = 1000) -> Sequence[OutcomeRecord]:
        raise NotImplementedError


class ConnectorRegistry:
    """Registry for runtime-discoverable connectors."""

    def __init__(self) -> None:
        self.prediction_connectors: dict[str, PredictionConnector] = {}
        self.outcome_connectors: dict[str, OutcomeConnector] = {}

    def register_prediction(self, connector: PredictionConnector) -> None:
        self.prediction_connectors[connector.name] = connector

    def register_outcome(self, connector: OutcomeConnector) -> None:
        self.outcome_connectors[connector.name] = connector

    def all_predictions(self) -> Iterable[PredictionConnector]:
        return self.prediction_connectors.values()

    def all_outcomes(self) -> Iterable[OutcomeConnector]:
        return self.outcome_connectors.values()


connector_registry = ConnectorRegistry()


__all__ = [
    "PredictionConnector",
    "OutcomeConnector",
    "ConnectorRegistry",
    "connector_registry",
]

