"""Mock connectors for local development."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Sequence
from uuid import uuid4

import numpy as np

from .base import PredictionConnector, OutcomeConnector, connector_registry
from ..models.domain import AssayContext, PredictionRecord, OutcomeRecord


class MockPredictionConnector(PredictionConnector):
    name = "mock_predictions"

    async def fetch_predictions(self, limit: int = 1000) -> Sequence[PredictionRecord]:
        now = datetime.utcnow()
        records: list[PredictionRecord] = []
        rng = np.random.default_rng(seed=42)
        for idx in range(min(limit, 50)):
            score = float(rng.normal(loc=50, scale=5))
            records.append(
                PredictionRecord(
                    record_id=str(uuid4()),
                    molecule_id=f"MOL-{idx:04d}",
                    model_id="moe",
                    model_version="2025.01",
                    score=score,
                    scored_at=now - timedelta(hours=idx),
                    context=AssayContext(assay_id="ASSAY-001", assay_version="1.0"),
                )
            )
        return records


class MockOutcomeConnector(OutcomeConnector):
    name = "mock_outcomes"

    async def fetch_outcomes(self, limit: int = 1000) -> Sequence[OutcomeRecord]:
        now = datetime.utcnow()
        records: list[OutcomeRecord] = []
        rng = np.random.default_rng(seed=43)
        for idx in range(min(limit, 50)):
            assay_result = float(rng.normal(loc=48, scale=6))
            records.append(
                OutcomeRecord(
                    record_id=str(uuid4()),
                    molecule_id=f"MOL-{idx:04d}",
                    assay_result=assay_result,
                    measured_at=now - timedelta(hours=idx),
                    context=AssayContext(assay_id="ASSAY-001", assay_version="1.0"),
                )
            )
        return records


def register_mock_connectors() -> None:
    connector_registry.register_prediction(MockPredictionConnector())
    connector_registry.register_outcome(MockOutcomeConnector())


__all__ = ["MockPredictionConnector", "MockOutcomeConnector", "register_mock_connectors"]

