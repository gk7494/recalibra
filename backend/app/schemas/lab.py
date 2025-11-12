"""Lab schemas"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class LabCreate(BaseModel):
    """Schema for creating a lab"""
    name: str


class LabResponse(BaseModel):
    """Schema for lab response"""
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


