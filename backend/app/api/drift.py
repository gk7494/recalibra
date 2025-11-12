"""Drift detection API endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.drift import DriftResponse
from app.services.drift import detect_drift

router = APIRouter(prefix="/models", tags=["drift"])


@router.get("/{model_id}/drift", response_model=DriftResponse)
async def get_model_drift(
    model_id: str,
    baseline_days: int = 30,
    recent_days: int = 7,
    db: Session = Depends(get_db)
):
    """
    Check for drift in a model by comparing baseline window to recent window.
    
    Args:
        model_id: Model ID to check
        baseline_days: Number of days for baseline window (default: 30)
        recent_days: Number of days for recent window (default: 7)
    """
    # Verify model exists
    from app.models.model import Model
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    try:
        result = detect_drift(db, model_id, baseline_days, recent_days)
        return DriftResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


