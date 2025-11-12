"""Model API endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.model import Model
from app.schemas.model import ModelCreate, ModelResponse

router = APIRouter(prefix="/models", tags=["models"])


@router.post("", response_model=ModelResponse, status_code=201)
async def create_model(model: ModelCreate, db: Session = Depends(get_db)):
    """Create a new model"""
    # Verify lab exists
    from app.models.lab import Lab
    lab = db.query(Lab).filter(Lab.id == model.lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    db_model = Model(**model.model_dump())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model


@router.get("", response_model=List[ModelResponse])
async def get_models(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all models"""
    models = db.query(Model).offset(skip).limit(limit).all()
    return models


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str, db: Session = Depends(get_db)):
    """Get a model by ID"""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.delete("/{model_id}", status_code=204)
async def delete_model(model_id: str, db: Session = Depends(get_db)):
    """Delete a model"""
    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(model)
    db.commit()
    return None


