"""Celery worker for Recalibra background processing."""

from __future__ import annotations

import asyncio

from celery import Celery

from recalibra.config import get_settings
from recalibra.service import RecalibraService

settings = get_settings()

celery_app = Celery(
    "recalibra",
    broker=settings.broker.url,
    backend=settings.broker.backend,
)

celery_app.conf.task_routes = {"recalibra.*": {"queue": "recalibra"}}
celery_app.conf.task_default_queue = "recalibra"

service = RecalibraService()


@celery_app.task(name="recalibra.ingest")
def ingest() -> dict[str, str | int]:
    """Trigger ingestion and monitoring pipeline."""
    linked_records = asyncio.run(service.ingest())
    metrics, drift = service.monitor(linked_records)
    return {
        "ingested": len(linked_records),
        "rmse": metrics.rmse,
        "mae": metrics.mae,
        "r2": metrics.r2,
        "psi": drift.psi,
        "ks_pvalue": drift.ks_pvalue,
    }


@celery_app.task(name="recalibra.recalibrate")
def recalibrate() -> str:
    """Trigger recalibration using most recent records."""
    linked_records = asyncio.run(service.latest(limit=100))
    if not linked_records:
        return "no_records"
    result = service.recalibrate(linked_records)
    return str(result.artifact_path)

