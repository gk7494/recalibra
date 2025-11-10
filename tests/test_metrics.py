from datetime import datetime

from recalibra.models.domain import AssayContext, LinkedRecord, OutcomeRecord, PredictionRecord
from recalibra.monitoring.metrics import compute_metrics


def _linked_records() -> list[LinkedRecord]:
    context = AssayContext(assay_id="ASSAY", assay_version="1.0")
    records = []
    for idx in range(5):
        prediction = PredictionRecord(
            record_id=f"pred-{idx}",
            molecule_id=f"M-{idx}",
            model_id="model",
            model_version="1",
            score=float(idx),
            scored_at=datetime.utcnow(),
            context=context,
        )
        outcome = OutcomeRecord(
            record_id=f"out-{idx}",
            molecule_id=f"M-{idx}",
            assay_result=float(idx + 0.5),
            measured_at=datetime.utcnow(),
            context=context,
        )
        records.append(LinkedRecord.from_records(prediction, outcome))
    return records


def test_compute_metrics_returns_values() -> None:
    snapshot = compute_metrics(_linked_records())
    assert snapshot.count == 5
    assert snapshot.rmse >= 0
    assert snapshot.mae > 0
