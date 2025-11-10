"""FastAPI service exposing Recalibra capabilities."""

from __future__ import annotations

import asyncio
import math
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from recalibra import get_version
from recalibra.config import get_settings
from recalibra.drift.detectors import DriftResult
from recalibra.monitoring.metrics import MetricSnapshot
from recalibra.recalibration.strategies import RecalibrationResult
from recalibra.service import RecalibraService

app = FastAPI(title="Recalibra API", version=get_version())
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

service = RecalibraService()


def _nan_to_none(value: float) -> float | None:
    return None if math.isnan(value) else value


class MetricSnapshotModel(BaseModel):
    rmse: float | None
    mae: float | None
    r2: float | None
    count: int

    @classmethod
    def from_domain(cls, snapshot: MetricSnapshot) -> "MetricSnapshotModel":
        return cls(
            rmse=_nan_to_none(snapshot.rmse),
            mae=_nan_to_none(snapshot.mae),
            r2=_nan_to_none(snapshot.r2),
            count=snapshot.count,
        )


class DriftResultModel(BaseModel):
    psi: float | None
    ks_statistic: float | None
    ks_pvalue: float | None
    breached: bool

    @classmethod
    def from_domain(cls, drift: DriftResult, breached: bool) -> "DriftResultModel":
        return cls(
            psi=_nan_to_none(drift.psi),
            ks_statistic=_nan_to_none(drift.ks_statistic),
            ks_pvalue=_nan_to_none(drift.ks_pvalue),
            breached=breached,
        )


class RecalibrationResultModel(BaseModel):
    strategy: str
    artifact_path: str
    notes: str | None

    @classmethod
    def from_domain(cls, result: RecalibrationResult) -> "RecalibrationResultModel":
        return cls(
            strategy=result.strategy,
            artifact_path=str(result.artifact_path),
            notes=result.notes,
        )


class IngestResponse(BaseModel):
    ingested: int
    metrics: MetricSnapshotModel
    drift: DriftResultModel
    recalibration_triggered: bool


class MetricsResponse(BaseModel):
    metrics: MetricSnapshotModel
    drift: DriftResultModel


class RecalibrationResponse(BaseModel):
    recalibration: RecalibrationResultModel


def get_service() -> RecalibraService:
    return service


@app.get("/health")
async def health() -> dict[str, Any]:
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.environment,
        "version": get_version(),
    }


@app.post("/ingest/run", response_model=IngestResponse)
async def run_ingestion(
    background_tasks: BackgroundTasks, service: RecalibraService = Depends(get_service)
) -> IngestResponse:
    linked_records = await service.ingest()
    metrics, drift = service.monitor(linked_records)

    settings = get_settings()
    breached = drift.breached(
        settings.monitoring.psi_threshold, settings.monitoring.ks_pvalue_threshold
    )
    if breached:
        background_tasks.add_task(service.recalibrate, linked_records)

    return IngestResponse(
        ingested=len(linked_records),
        metrics=MetricSnapshotModel.from_domain(metrics),
        drift=DriftResultModel.from_domain(drift, breached),
        recalibration_triggered=breached,
    )


@app.get("/metrics/latest", response_model=MetricsResponse)
async def latest_metrics(service: RecalibraService = Depends(get_service)) -> MetricsResponse:
    linked = await service.latest(limit=100)
    if not linked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No linked records available."
        )
    metrics, drift = service.monitor(linked)
    settings = get_settings()
    breached = drift.breached(
        settings.monitoring.psi_threshold, settings.monitoring.ks_pvalue_threshold
    )
    return MetricsResponse(
        metrics=MetricSnapshotModel.from_domain(metrics),
        drift=DriftResultModel.from_domain(drift, breached),
    )


@app.post("/recalibrate", response_model=RecalibrationResponse)
async def run_recalibration(service: RecalibraService = Depends(get_service)) -> RecalibrationResponse:
    linked = await service.latest(limit=100)
    if not linked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No linked records available."
        )
    result = service.recalibrate(linked)
    return RecalibrationResponse(recalibration=RecalibrationResultModel.from_domain(result))


@app.on_event("startup")
async def startup_event() -> None:  # pragma: no cover
    async def seed() -> None:
        await service.ingest()

    asyncio.create_task(seed())

