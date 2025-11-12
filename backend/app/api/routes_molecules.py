"""FastAPI routes for molecule operations"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models import Molecule

router = APIRouter(prefix="/api", tags=["molecules"])


# Pydantic schemas
class MoleculeCreate(BaseModel):
    name: str
    compound_id: Optional[str] = None
    formula: Optional[str] = None
    molecular_formula: Optional[str] = None  # Accept both for frontend compatibility
    molecular_weight: Optional[float] = None
    cas_number: Optional[str] = None
    smiles: Optional[str] = None
    inchi: Optional[str] = None


class MoleculeUpdate(BaseModel):
    name: Optional[str] = None
    compound_id: Optional[str] = None
    formula: Optional[str] = None
    molecular_formula: Optional[str] = None  # Accept both for frontend compatibility
    molecular_weight: Optional[float] = None
    cas_number: Optional[str] = None
    smiles: Optional[str] = None
    inchi: Optional[str] = None


class MoleculeResponse(BaseModel):
    id: str
    name: str
    compound_id: Optional[str]
    formula: Optional[str]
    molecular_formula: Optional[str] = None  # Alias for formula for frontend compatibility
    molecular_weight: Optional[float]
    cas_number: Optional[str]
    smiles: Optional[str]
    inchi: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to map formula to molecular_formula"""
        data = {
            "id": obj.id,
            "name": obj.name,
            "compound_id": obj.compound_id,
            "formula": obj.formula,
            "molecular_formula": obj.formula,  # Map formula to molecular_formula for frontend
            "molecular_weight": obj.molecular_weight,
            "cas_number": obj.cas_number,
            "smiles": obj.smiles,
            "inchi": obj.inchi,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at
        }
        return cls(**data)


@router.get("/molecules", response_model=List[MoleculeResponse])
async def get_molecules(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all molecules with optional search.
    
    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        search: Optional search term for name or compound_id
        db: Database session
    
    Returns:
        List of molecule objects
    """
    query = db.query(Molecule)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Molecule.name.ilike(search_term)) |
            (Molecule.compound_id.ilike(search_term))
        )
    
    molecules = query.order_by(Molecule.created_at.desc()).offset(skip).limit(limit).all()
    # Map formula to molecular_formula for frontend compatibility
    result = []
    for mol in molecules:
        result.append({
            "id": mol.id,
            "name": mol.name,
            "compound_id": mol.compound_id,
            "formula": mol.formula,
            "molecular_formula": mol.formula,  # Add alias for frontend
            "molecular_weight": mol.molecular_weight,
            "cas_number": mol.cas_number,
            "smiles": mol.smiles,
            "inchi": mol.inchi,
            "created_at": mol.created_at,
            "updated_at": mol.updated_at
        })
    return result


@router.post("/molecules", response_model=MoleculeResponse, status_code=201)
async def create_molecule(
    molecule: MoleculeCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new molecule.
    
    Args:
        molecule: Molecule data
        db: Database session
    
    Returns:
        Created molecule object
    """
    try:
        # Map the Pydantic model fields to database model fields
        molecule_dict = molecule.dict()
        # Use molecular_formula if provided, otherwise use formula
        formula_value = molecule_dict.get("molecular_formula") or molecule_dict.get("formula")
        db_molecule = Molecule(
            name=molecule_dict["name"],
            compound_id=molecule_dict.get("compound_id"),
            formula=formula_value,  # Database uses 'formula'
            molecular_weight=molecule_dict.get("molecular_weight"),
            cas_number=molecule_dict.get("cas_number"),
            smiles=molecule_dict.get("smiles"),
            inchi=molecule_dict.get("inchi")
        )
        db.add(db_molecule)
        db.commit()
        db.refresh(db_molecule)
        # Map formula to molecular_formula for frontend compatibility
        return {
            "id": db_molecule.id,
            "name": db_molecule.name,
            "compound_id": db_molecule.compound_id,
            "formula": db_molecule.formula,
            "molecular_formula": db_molecule.formula,  # Add alias for frontend
            "molecular_weight": db_molecule.molecular_weight,
            "cas_number": db_molecule.cas_number,
            "smiles": db_molecule.smiles,
            "inchi": db_molecule.inchi,
            "created_at": db_molecule.created_at,
            "updated_at": db_molecule.updated_at
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating molecule: {str(e)}")


@router.get("/molecules/{molecule_id}", response_model=MoleculeResponse)
async def get_molecule(
    molecule_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a single molecule by ID.
    
    Args:
        molecule_id: Molecule identifier
        db: Database session
    
    Returns:
        Molecule object
    
    Raises:
        HTTPException 404: If molecule not found
    """
    molecule = db.query(Molecule).filter(Molecule.id == molecule_id).first()
    if not molecule:
        raise HTTPException(status_code=404, detail="Molecule not found")
    # Map formula to molecular_formula for frontend compatibility
    return {
        "id": molecule.id,
        "name": molecule.name,
        "compound_id": molecule.compound_id,
        "formula": molecule.formula,
        "molecular_formula": molecule.formula,  # Add alias for frontend
        "molecular_weight": molecule.molecular_weight,
        "cas_number": molecule.cas_number,
        "smiles": molecule.smiles,
        "inchi": molecule.inchi,
        "created_at": molecule.created_at,
        "updated_at": molecule.updated_at
    }


@router.patch("/molecules/{molecule_id}", response_model=MoleculeResponse)
async def update_molecule(
    molecule_id: str,
    molecule_update: MoleculeUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a molecule.
    
    Args:
        molecule_id: Molecule identifier
        molecule_update: Fields to update
        db: Database session
    
    Returns:
        Updated molecule object
    
    Raises:
        HTTPException 404: If molecule not found
    """
    molecule = db.query(Molecule).filter(Molecule.id == molecule_id).first()
    if not molecule:
        raise HTTPException(status_code=404, detail="Molecule not found")
    
    update_data = molecule_update.dict(exclude_unset=True)
    # Map molecular_formula to formula if provided
    if "molecular_formula" in update_data:
        update_data["formula"] = update_data.pop("molecular_formula")
    
    for field, value in update_data.items():
        if hasattr(molecule, field):
            setattr(molecule, field, value)
    
    molecule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(molecule)
    # Map formula to molecular_formula for frontend compatibility
    return {
        "id": molecule.id,
        "name": molecule.name,
        "compound_id": molecule.compound_id,
        "formula": molecule.formula,
        "molecular_formula": molecule.formula,  # Add alias for frontend
        "molecular_weight": molecule.molecular_weight,
        "cas_number": molecule.cas_number,
        "smiles": molecule.smiles,
        "inchi": molecule.inchi,
        "created_at": molecule.created_at,
        "updated_at": molecule.updated_at
    }


@router.delete("/molecules/{molecule_id}", status_code=204)
async def delete_molecule(
    molecule_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a molecule (soft delete by setting a flag, or hard delete).
    
    Args:
        molecule_id: Molecule identifier
        db: Database session
    
    Raises:
        HTTPException 404: If molecule not found
    """
    molecule = db.query(Molecule).filter(Molecule.id == molecule_id).first()
    if not molecule:
        raise HTTPException(status_code=404, detail="Molecule not found")
    
    db.delete(molecule)
    db.commit()
    return None

