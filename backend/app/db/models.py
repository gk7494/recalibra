"""Database models for Recalibra"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class Model(Base):
    """ML Model tracking"""
    __tablename__ = "models"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # "open" or "closed"
    source_system = Column(String)  # "MOE", "custom", etc.
    version = Column(String)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_retrained_at = Column(DateTime)
    
    # Relationships
    predictions = relationship("ModelPrediction", back_populates="model")
    drift_checks = relationship("DriftCheck", back_populates="model")
    correction_models = relationship("CorrectionModel", back_populates="model")

class ModelPrediction(Base):
    """Model predictions (from MOE or other systems)"""
    __tablename__ = "model_predictions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    molecule_id = Column(String, index=True, nullable=False)
    model_id = Column(String, ForeignKey("models.id"), index=True, nullable=False)
    y_pred = Column(Float, nullable=False)  # Predicted value (e.g., docking score)
    reagent_batch = Column(String, index=True)
    assay_version = Column(String, index=True)
    instrument_id = Column(String, index=True)
    run_timestamp = Column(DateTime, index=True)
    metadata_json = Column(JSON)  # Additional metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    model = relationship("Model", back_populates="predictions")

class AssayResult(Base):
    """Experimental assay results (from Benchling)"""
    __tablename__ = "assay_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    benchling_id = Column(String, unique=True, index=True)  # Benchling record ID
    molecule_id = Column(String, index=True, nullable=False)
    assay_version = Column(String, index=True)
    reagent_batch = Column(String, index=True)
    instrument_id = Column(String, index=True)
    operator = Column(String, index=True)
    y_true = Column(Float, nullable=False)  # Measured value (e.g., IC50)
    run_timestamp = Column(DateTime, index=True)
    metadata_json = Column(JSON)  # Additional metadata from Benchling
    created_at = Column(DateTime, default=datetime.utcnow)

class DriftCheck(Base):
    """Drift detection results"""
    __tablename__ = "drift_checks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String, ForeignKey("models.id"), index=True, nullable=False)
    check_timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    drift_detected = Column(String, nullable=False)  # "YES" or "NO"
    ks_stat = Column(Float)
    ks_p = Column(Float)
    psi = Column(Float)
    enough_data = Column(String, default="YES")  # "YES" or "NO"
    details = Column(JSON)
    
    # Relationships
    model = relationship("Model", back_populates="drift_checks")

class CorrectionModel(Base):
    """Trained correction layer models"""
    __tablename__ = "correction_models"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String, ForeignKey("models.id"), index=True, nullable=False)
    file_path = Column(String, nullable=False)
    mae = Column(Float)  # Mean Absolute Error on training data
    rmse = Column(Float)
    r_squared = Column(Float)
    training_samples = Column(Integer)
    trained_at = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(JSON)
    
    # Relationships
    model = relationship("Model", back_populates="correction_models")


class Molecule(Base):
    """Molecule/Compound tracking"""
    __tablename__ = "molecules"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    compound_id = Column(String, index=True)
    formula = Column(String)  # molecular_formula
    molecular_weight = Column(Float)
    cas_number = Column(String)
    smiles = Column(String)
    inchi = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

