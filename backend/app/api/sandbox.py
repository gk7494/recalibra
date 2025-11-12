"""Sandbox/seed endpoints for demo data"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import random
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.lab import Lab
from app.models.model import Model
from app.models.dataset import Dataset
from app.models.record import Record

router = APIRouter(prefix="/sandbox", tags=["sandbox"])


@router.post("/seed")
async def seed_sandbox_data(db: Session = Depends(get_db)):
    """
    Seed the database with fake records for a model with slight drift in recent weeks.
    """
    # Create a lab
    lab = Lab(name="Demo Lab")
    db.add(lab)
    db.flush()
    
    # Create a model
    model = Model(
        lab_id=lab.id,
        name="MOE Docking Model",
        type="docking",
        source_system="MOE"
    )
    db.add(model)
    db.flush()
    
    # Create a dataset
    dataset = Dataset(
        model_id=model.id,
        name="Demo Dataset"
    )
    db.add(dataset)
    db.flush()
    
    # Generate records with clear drift pattern for demo
    # Baseline: 4 weeks of good predictions (high R², low RMSE)
    # Recent: 1 week with drift (lower R², higher RMSE)
    
    now = datetime.utcnow()
    records = []
    
    # Baseline period (4 weeks ago to 1 week ago) - GOOD predictions
    baseline_start = now - timedelta(weeks=4)
    baseline_end = now - timedelta(weeks=1)
    baseline_days = (baseline_end - baseline_start).days
    
    # Generate ~150 records for baseline with good accuracy
    for i in range(150):
        # Distribute records across the baseline period
        day_offset = random.randint(0, baseline_days)
        hour_offset = random.randint(0, 23)
        timestamp = baseline_start + timedelta(days=day_offset, hours=hour_offset)
        
        if timestamp > baseline_end:
            continue
        
        # Good predictions: high correlation, small random error
        # Simulate realistic IC50 values (typically 0.1 to 100 μM)
        true_value = random.uniform(0.5, 50.0)
        # Small prediction error (good model performance)
        prediction_error = random.gauss(0, true_value * 0.08)  # ~8% relative error
        prediction_value = max(0.1, true_value + prediction_error)  # Ensure positive
        
        records.append(Record(
            dataset_id=dataset.id,
            molecule_id=f"MOL-{i:05d}",
            assay_version="v2.1",
            reagent_batch="BATCH-2024-001",
            instrument_id="LC-MS-01",
            operator_id="operator-1",
            prediction_value=round(prediction_value, 3),
            observed_value=round(true_value, 3),
            timestamp=timestamp
        ))
    
    # Recent period (1 week ago to now) - DRIFT detected
    recent_start = now - timedelta(weeks=1)
    recent_days = (now - recent_start).days
    
    # Generate ~50 records for recent period with clear drift
    for i in range(50):
        day_offset = random.randint(0, recent_days)
        hour_offset = random.randint(0, 23)
        timestamp = recent_start + timedelta(days=day_offset, hours=hour_offset)
        
        if timestamp > now:
            continue
        
        # Drift: systematic bias + larger errors
        # Same value range but predictions are systematically off
        true_value = random.uniform(0.5, 50.0)
        # Systematic bias: predictions are consistently higher
        systematic_bias = random.gauss(8.0, 2.0)  # ~8-12 μM systematic overprediction
        random_error = random.gauss(0, true_value * 0.15)  # Larger random error (~15%)
        prediction_error = systematic_bias + random_error
        prediction_value = max(0.1, true_value + prediction_error)
        
        records.append(Record(
            dataset_id=dataset.id,
            molecule_id=f"MOL-{150+i:05d}",
            assay_version="v2.1",
            reagent_batch="BATCH-2024-002",  # Different batch (potential cause)
            instrument_id="LC-MS-02",  # Different instrument
            operator_id="operator-2",  # Different operator
            prediction_value=round(prediction_value, 3),
            observed_value=round(true_value, 3),
            timestamp=timestamp
        ))
    
    db.add_all(records)
    db.commit()
    
    return {
        "message": "Sandbox data seeded successfully",
        "lab_id": lab.id,
        "model_id": model.id,
        "dataset_id": dataset.id,
        "records_created": len(records),
        "baseline_records": 150,
        "recent_records": 50,
        "note": "Baseline: 4 weeks of good predictions. Recent: 1 week with drift (systematic bias detected)"
    }


