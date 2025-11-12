"""Dataset API endpoints"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io
from datetime import datetime
from app.core.database import get_db
from app.models.dataset import Dataset
from app.models.record import Record
from app.schemas.dataset import DatasetCreate, DatasetResponse
from app.schemas.record import RecordResponse

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("", response_model=DatasetResponse, status_code=201)
async def create_dataset(dataset: DatasetCreate, db: Session = Depends(get_db)):
    """Create a new dataset"""
    # Verify model exists
    from app.models.model import Model
    model = db.query(Model).filter(Model.id == dataset.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    db_dataset = Dataset(**dataset.model_dump())
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    return db_dataset


@router.get("", response_model=List[DatasetResponse])
async def get_datasets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all datasets"""
    datasets = db.query(Dataset).offset(skip).limit(limit).all()
    return datasets


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Get a dataset by ID"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/{dataset_id}/upload", status_code=201)
async def upload_csv(
    dataset_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a CSV file of records for a dataset.
    
    Expected CSV format:
    molecule_id,assay_version,reagent_batch,instrument_id,operator_id,prediction_value,observed_value,timestamp
    """
    # Verify dataset exists
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Read CSV file
    contents = await file.read()
    csv_file = io.StringIO(contents.decode("utf-8"))
    reader = csv.DictReader(csv_file)
    
    records_created = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        try:
            # Parse timestamp if provided
            timestamp = datetime.utcnow()
            if "timestamp" in row and row["timestamp"]:
                try:
                    timestamp = datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))
                except:
                    pass  # Use current time if parsing fails
            
            record = Record(
                dataset_id=dataset_id,
                molecule_id=row["molecule_id"],
                assay_version=row.get("assay_version"),
                reagent_batch=row.get("reagent_batch"),
                instrument_id=row.get("instrument_id"),
                operator_id=row.get("operator_id"),
                prediction_value=float(row["prediction_value"]),
                observed_value=float(row["observed_value"]),
                timestamp=timestamp
            )
            db.add(record)
            records_created += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    db.commit()
    
    return {
        "dataset_id": dataset_id,
        "records_created": records_created,
        "errors": errors
    }


@router.get("/{dataset_id}/records", response_model=List[RecordResponse])
async def get_dataset_records(
    dataset_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get records for a dataset"""
    records = db.query(Record).filter(
        Record.dataset_id == dataset_id
    ).offset(skip).limit(limit).all()
    return records


