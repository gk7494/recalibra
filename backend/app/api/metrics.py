"""Metrics API endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.metrics import MetricsResponse, MetricsTimeSeriesResponse
from app.services.metrics import calculate_metrics, calculate_metrics_by_time_buckets
from app.models.record import Record

router = APIRouter(prefix="/models", tags=["metrics"])


@router.get("/{model_id}/metrics", response_model=MetricsTimeSeriesResponse)
async def get_model_metrics(
    model_id: str,
    bucket_size: str = "week",
    db: Session = Depends(get_db)
):
    """
    Get metrics (RMSE, MAE, R²) for a model, grouped by time buckets.
    
    Args:
        model_id: Model ID
        bucket_size: Time bucket size ("day", "week", "month")
    """
    # Verify model exists
    from app.models.model import Model
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    try:
        result = calculate_metrics_by_time_buckets(db, model_id, bucket_size)
        return MetricsTimeSeriesResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


