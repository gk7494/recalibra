"""Pipelines for ingesting predictions and outcomes into storage."""

from __future__ import annotations

from typing import Sequence

from ..connectors.base import connector_registry
from ..models.domain import LinkedRecord
from ..storage.repository import InMemoryStore


class IngestionPipeline:
    """Coordinate connector fetches and persist data."""

    def __init__(self, store: InMemoryStore | None = None) -> None:
        self.store = store or InMemoryStore()

    async def ingest(self) -> Sequence[LinkedRecord]:
        """Fetch predictions and outcomes and link them."""
        predictions = []
        for connector in connector_registry.all_predictions():
            predictions.extend(await connector.fetch_predictions())

        outcomes = []
        for connector in connector_registry.all_outcomes():
            outcomes.extend(await connector.fetch_outcomes())

        await self.store.upsert_predictions(predictions)
        await self.store.upsert_outcomes(outcomes)

        outcome_by_molecule = {record.molecule_id: record for record in outcomes}
        linked = []
        for prediction in predictions:
            outcome = outcome_by_molecule.get(prediction.molecule_id)
            if not outcome:
                continue
            linked.append(LinkedRecord.from_records(prediction, outcome))
        await self.store.link_records(linked)
        return linked


__all__ = ["IngestionPipeline"]

