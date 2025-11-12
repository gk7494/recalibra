"""Dataset schemas"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DatasetCreate(BaseModel):
    """Schema for creating a dataset"""
    model_id: str
    name: str


class DatasetResponse(BaseModel):
    """Schema for dataset response"""
    id: str
    model_id: str
    name: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


