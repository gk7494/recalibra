"""
Data models for the Recalibra SDK
"""

from typing import Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class Molecule:
    """Molecule model"""
    id: str
    name: str
    compound_id: Optional[str] = None
    smiles: Optional[str] = None
    inchi: Optional[str] = None
    cas_number: Optional[str] = None
    molecular_formula: Optional[str] = None
    molecular_weight: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Assay:
    """Assay model"""
    id: str
    name: str
    assay_type: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    cell_line: Optional[str] = None
    target: Optional[str] = None
    reagent_batch: Optional[str] = None
    instrument_id: Optional[str] = None
    operator: Optional[str] = None
    buffer_conditions: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Model:
    """Model model"""
    id: str
    name: str
    model_type: str
    source_system: str
    version: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_retrained_at: Optional[datetime] = None


@dataclass
class Prediction:
    """Prediction model"""
    id: str
    model_id: str
    molecule_id: str
    predicted_value: float
    value_type: Optional[str] = "IC50"
    units: Optional[str] = "μM"
    confidence_score: Optional[float] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


@dataclass
class ExperimentalResult:
    """Experimental result model"""
    id: str
    molecule_id: str
    assay_id: str
    measured_value: float
    value_type: Optional[str] = "IC50"
    units: Optional[str] = "μM"
    uncertainty: Optional[float] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


@dataclass
class DriftCheck:
    """Drift check model"""
    id: str
    model_id: str
    check_timestamp: datetime
    drift_detected: bool
    ks_statistic: Optional[float] = None
    psi_value: Optional[float] = None
    kl_divergence: Optional[float] = None
    rmse: Optional[float] = None
    mae: Optional[float] = None
    r_squared: Optional[float] = None
    details: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


@dataclass
class DriftCheckResult:
    """Result of a drift check"""
    drift_detected: bool
    ks_statistic: float
    psi_value: float
    kl_divergence: float
    rmse: float
    mae: float
    r_squared: float
    n_samples: int


