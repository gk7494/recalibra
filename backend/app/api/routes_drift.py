"""FastAPI routes for drift checks"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models import DriftCheck, Model
from app.services.drift import get_training_frame, detect_drift

router = APIRouter(prefix="/api", tags=["drift"])


# Pydantic schemas
class DriftCheckRunRequest(BaseModel):
    model_id: str
    start_time: Optional[str] = None  # ISO string
    end_time: Optional[str] = None    # ISO string


class DriftCheckResponse(BaseModel):
    id: str
    model_id: str
    check_timestamp: datetime
    drift_detected: str  # "YES" or "NO"
    ks_stat: Optional[float]
    ks_p: Optional[float]
    psi: Optional[float]
    r_squared: Optional[float] = None
    rmse: Optional[float] = None
    mae: Optional[float] = None
    enough_data: str
    details: Optional[dict] = None
    
    class Config:
        from_attributes = True


@router.post("/drift-checks/run", response_model=DriftCheckResponse)
async def run_drift_check(
    request: DriftCheckRunRequest,
    db: Session = Depends(get_db)
):
    """
    Run a drift check for a model.
    
    Pulls predictions + assay results joined by molecule_id (and time window if provided).
    Computes metrics (RMSE, MAE, R²) and drift tests (KS, PSI).
    Stores a DriftCheck record.
    
    Args:
        request: Drift check request with model_id and optional time window
        db: Database session
    
    Returns:
        DriftCheck object with results
    
    Raises:
        HTTPException 404: If model not found
        HTTPException 400: If insufficient data
    """
    import logging
    import numpy as np
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    
    logger = logging.getLogger(__name__)
    
    # Verify model exists
    model = db.query(Model).filter(Model.id == request.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Get training frame (joined predictions and results)
    df = get_training_frame(db, request.model_id)
    if df is None or len(df) == 0:
        raise HTTPException(
            status_code=400,
            detail="No matched predictions and results found. Sync data first."
        )
    
    # Apply time window filter if provided
    if request.start_time or request.end_time:
        if request.start_time:
            start_dt = datetime.fromisoformat(request.start_time.replace('Z', '+00:00'))
            df = df[df['run_timestamp'] >= start_dt]
        if request.end_time:
            end_dt = datetime.fromisoformat(request.end_time.replace('Z', '+00:00'))
            df = df[df['run_timestamp'] <= end_dt]
        
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No data in specified time window"
            )
    
    # Calculate metrics
    df_clean = df.dropna(subset=['y_pred', 'y_true'])
    if len(df_clean) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient data for drift check (need at least 10 pairs, found {len(df_clean)})"
        )
    
    y_pred = df_clean['y_pred'].values
    y_true = df_clean['y_true'].values
    
    r_squared = float(r2_score(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    
    # Detect drift
    drift_results = detect_drift(df)
    
    # Store drift check
    enough_data = drift_results.get("enough_data", True)
    drift_detected = drift_results.get("drift_detected", "NO")
    
    drift_check = DriftCheck(
        model_id=request.model_id,
        check_timestamp=datetime.utcnow(),
        drift_detected=drift_detected,
        ks_stat=drift_results.get("ks_stat"),
        ks_p=drift_results.get("ks_p"),
        psi=drift_results.get("psi"),
        enough_data="YES" if enough_data else "NO",
        details={
            **drift_results,
            "r_squared": r_squared,
            "rmse": rmse,
            "mae": mae,
            "n_samples": len(df_clean)
        }
    )
    db.add(drift_check)
    db.commit()
    db.refresh(drift_check)
    
    logger.info(f"Drift check completed for model {request.model_id}: {drift_detected}")
    
    # Return with metrics (include both field names for compatibility)
    return {
        "id": drift_check.id,
        "model_id": drift_check.model_id,
        "check_timestamp": drift_check.check_timestamp,
        "drift_detected": drift_check.drift_detected,
        "ks_stat": drift_check.ks_stat,
        "ks_statistic": drift_check.ks_stat,  # Alias for frontend compatibility
        "ks_p": drift_check.ks_p,
        "psi": drift_check.psi,
        "psi_value": drift_check.psi,  # Alias for frontend compatibility
        "r_squared": r_squared,
        "rmse": rmse,
        "mae": mae,
        "enough_data": drift_check.enough_data,
        "details": drift_check.details
    }


@router.get("/drift-checks", response_model=List[DriftCheckResponse])
async def get_drift_checks(
    model_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get drift checks with optional filtering by model.
    
    Args:
        model_id: Optional model ID to filter by
        limit: Maximum number of records to return
        offset: Number of records to skip
        db: Database session
    
    Returns:
        List of drift check records ordered by check_timestamp DESC
    """
    query = db.query(DriftCheck)
    
    if model_id:
        query = query.filter(DriftCheck.model_id == model_id)
    
    checks = query.order_by(DriftCheck.check_timestamp.desc()).offset(offset).limit(limit).all()
    
    # Add metrics from details if available (include both field names for compatibility)
    result = []
    for check in checks:
        details = check.details or {}
        result.append({
            "id": check.id,
            "model_id": check.model_id,
            "check_timestamp": check.check_timestamp,
            "drift_detected": check.drift_detected,
            "ks_stat": check.ks_stat,
            "ks_statistic": check.ks_stat,  # Alias for frontend compatibility
            "ks_p": check.ks_p,
            "psi": check.psi,
            "psi_value": check.psi,  # Alias for frontend compatibility
            "r_squared": details.get("r_squared"),
            "rmse": details.get("rmse"),
            "mae": details.get("mae"),
            "enough_data": check.enough_data,
            "details": check.details
        })
    
    return result

