"""High-level service orchestrating monitoring and recalibration."""

from __future__ import annotations

from typing import Sequence

from .config import get_settings
from .connectors.mock import register_mock_connectors
from .monitoring.metrics import MetricSnapshot
from .drift.detectors import DriftResult
from .pipelines.ingestion import IngestionPipeline
from .pipelines.monitoring import MonitoringPipeline
from .pipelines.recalibration import RecalibrationPipeline
from .storage.repository import InMemoryStore
from .models.domain import LinkedRecord


class RecalibraService:
    """Coordinator across ingestion, monitoring, and recalibration workflows."""

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self.store = store or InMemoryStore()
        self.ingestion = IngestionPipeline(self.store)
        self.monitoring = MonitoringPipeline()
        self.recalibration = RecalibrationPipeline()
        self.settings = get_settings()
        register_mock_connectors()

    async def ingest(self) -> Sequence[LinkedRecord]:
        return await self.ingestion.ingest()

    def monitor(self, records: Sequence[LinkedRecord]) -> tuple[MetricSnapshot, DriftResult]:
        return self.monitoring.run(records)

    def recalibrate(self, records: Sequence[LinkedRecord]):
        return self.recalibration.run(records)

    async def latest(self, limit: int = 100) -> Sequence[LinkedRecord]:
        return await self.store.latest(limit)


__all__ = ["RecalibraService"]

