"""Model schemas"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class ModelCreate(BaseModel):
    """Schema for creating a model"""
    lab_id: str
    name: str
    type: Optional[str] = None
    source_system: str  # "MOE" | "internal" | "other"


class ModelResponse(BaseModel):
    """Schema for model response"""
    id: str
    lab_id: str
    name: str
    type: Optional[str]
    source_system: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


