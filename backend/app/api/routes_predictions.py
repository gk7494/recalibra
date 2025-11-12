"""FastAPI routes for predictions and assay results bulk operations"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models import ModelPrediction, AssayResult, Model
import uuid

router = APIRouter(prefix="/api", tags=["predictions"])


# Pydantic schemas
class PredictionBulkItem(BaseModel):
    model_id: str
    molecule_id: str
    run_at: datetime
    predicted_value: float
    metadata: dict = {}


class PredictionBulkRequest(BaseModel):
    predictions: List[PredictionBulkItem]


class AssayResultBulkItem(BaseModel):
    molecule_id: str
    assay_id: str
    value_type: str
    observed_value: float
    run_at: datetime
    metadata: dict = {}


class AssayResultBulkRequest(BaseModel):
    assay_results: List[AssayResultBulkItem]


@router.post("/predictions/bulk")
async def create_predictions_bulk(
    request: PredictionBulkRequest,
    db: Session = Depends(get_db)
):
    """
    Bulk create predictions.
    
    Args:
        request: List of predictions to create
        db: Database session
    
    Returns:
        Dictionary with created_count and errors
    """
    created = 0
    errors = []
    
    for idx, pred_data in enumerate(request.predictions):
        try:
            # Verify model exists
            model = db.query(Model).filter(Model.id == pred_data.model_id).first()
            if not model:
                errors.append(f"Item {idx}: Model {pred_data.model_id} not found")
                continue
            
            # Extract metadata fields
            metadata = pred_data.metadata or {}
            
            db_pred = ModelPrediction(
                model_id=pred_data.model_id,
                molecule_id=pred_data.molecule_id,
                y_pred=pred_data.predicted_value,
                run_timestamp=pred_data.run_at,
                reagent_batch=metadata.get("reagent_batch"),
                assay_version=metadata.get("assay_version"),
                instrument_id=metadata.get("instrument_id"),
                metadata_json=metadata
            )
            db.add(db_pred)
            created += 1
        except Exception as e:
            errors.append(f"Item {idx}: {str(e)}")
    
    db.commit()
    
    return {
        "created_count": created,
        "errors": errors,
        "total": len(request.predictions)
    }


@router.post("/assay-results/bulk")
async def create_assay_results_bulk(
    request: AssayResultBulkRequest,
    db: Session = Depends(get_db)
):
    """
    Bulk create assay results.
    
    Args:
        request: List of assay results to create
        db: Database session
    
    Returns:
        Dictionary with created_count and errors
    """
    created = 0
    errors = []
    
    for idx, result_data in enumerate(request.assay_results):
        try:
            # Extract metadata fields
            metadata = result_data.metadata or {}
            
            db_result = AssayResult(
                benchling_id=result_data.assay_id,  # Use assay_id as benchling_id
                molecule_id=result_data.molecule_id,
                y_true=result_data.observed_value,
                run_timestamp=result_data.run_at,
                assay_version=metadata.get("assay_version"),
                reagent_batch=metadata.get("reagent_batch"),
                instrument_id=metadata.get("instrument_id"),
                operator=metadata.get("operator"),
                metadata_json=metadata
            )
            db.add(db_result)
            created += 1
        except Exception as e:
            errors.append(f"Item {idx}: {str(e)}")
    
    db.commit()
    
    return {
        "created_count": created,
        "errors": errors,
        "total": len(request.assay_results)
    }




