"""Lab API endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.lab import Lab
from app.schemas.lab import LabCreate, LabResponse

router = APIRouter(prefix="/labs", tags=["labs"])


@router.post("", response_model=LabResponse, status_code=201)
async def create_lab(lab: LabCreate, db: Session = Depends(get_db)):
    """Create a new lab"""
    db_lab = Lab(**lab.model_dump())
    db.add(db_lab)
    db.commit()
    db.refresh(db_lab)
    return db_lab


@router.get("", response_model=List[LabResponse])
async def get_labs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all labs"""
    labs = db.query(Lab).offset(skip).limit(limit).all()
    return labs


@router.get("/{lab_id}", response_model=LabResponse)
async def get_lab(lab_id: str, db: Session = Depends(get_db)):
    """Get a lab by ID"""
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    return lab


@router.delete("/{lab_id}", status_code=204)
async def delete_lab(lab_id: str, db: Session = Depends(get_db)):
    """Delete a lab"""
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    db.delete(lab)
    db.commit()
    return None


