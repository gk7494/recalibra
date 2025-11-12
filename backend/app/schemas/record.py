"""Record schemas"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class RecordCreate(BaseModel):
    """Schema for creating a record"""
    dataset_id: str
    molecule_id: str
    assay_version: Optional[str] = None
    reagent_batch: Optional[str] = None
    instrument_id: Optional[str] = None
    operator_id: Optional[str] = None
    prediction_value: float
    observed_value: float
    timestamp: Optional[datetime] = None


class RecordResponse(BaseModel):
    """Schema for record response"""
    id: str
    dataset_id: str
    molecule_id: str
    assay_version: Optional[str]
    reagent_batch: Optional[str]
    instrument_id: Optional[str]
    operator_id: Optional[str]
    prediction_value: float
    observed_value: float
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)


