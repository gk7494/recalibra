"""
Recalibra API Client

Main client class for interacting with the Recalibra API.
"""

import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime
from .models import (
    Molecule,
    Assay,
    Model,
    Prediction,
    ExperimentalResult,
    DriftCheck,
    DriftCheckResult
)


class RecalibraClient:
    """Client for interacting with the Recalibra API"""
    
    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: Optional[str] = None,
        timeout: float = 30.0
    ):
        """
        Initialize the Recalibra client.
        
        Args:
            base_url: Base URL of the Recalibra API
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {}
        )
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
    
    def close(self):
        """Close the HTTP client"""
        self._client.close()
    
    # Health check
    def health(self) -> Dict[str, str]:
        """Check API health"""
        response = self._client.get("/health")
        response.raise_for_status()
        return response.json()
    
    # Molecules
    def create_molecule(
        self,
        name: str,
        compound_id: Optional[str] = None,
        smiles: Optional[str] = None,
        inchi: Optional[str] = None,
        cas_number: Optional[str] = None,
        molecular_formula: Optional[str] = None,
        molecular_weight: Optional[float] = None
    ) -> Molecule:
        """Create a new molecule"""
        data = {
            "name": name,
            "compound_id": compound_id,
            "smiles": smiles,
            "inchi": inchi,
            "cas_number": cas_number,
            "molecular_formula": molecular_formula,
            "molecular_weight": molecular_weight
        }
        response = self._client.post("/api/molecules", json=data)
        response.raise_for_status()
        return Molecule(**response.json())
    
    def get_molecules(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Molecule]:
        """Get all molecules"""
        response = self._client.get(
            "/api/molecules",
            params={"skip": skip, "limit": limit}
        )
        response.raise_for_status()
        return [Molecule(**item) for item in response.json()]
    
    def get_molecule(self, molecule_id: str) -> Molecule:
        """Get a specific molecule by ID"""
        response = self._client.get(f"/api/molecules/{molecule_id}")
        response.raise_for_status()
        return Molecule(**response.json())
    
    # Assays
    def create_assay(
        self,
        name: str,
        assay_type: Optional[str] = None,
        version: Optional[str] = None,
        description: Optional[str] = None,
        cell_line: Optional[str] = None,
        target: Optional[str] = None,
        reagent_batch: Optional[str] = None,
        instrument_id: Optional[str] = None,
        operator: Optional[str] = None,
        buffer_conditions: Optional[str] = None
    ) -> Assay:
        """Create a new assay"""
        data = {
            "name": name,
            "assay_type": assay_type,
            "version": version,
            "description": description,
            "cell_line": cell_line,
            "target": target,
            "reagent_batch": reagent_batch,
            "instrument_id": instrument_id,
            "operator": operator,
            "buffer_conditions": buffer_conditions
        }
        response = self._client.post("/api/assays", json=data)
        response.raise_for_status()
        return Assay(**response.json())
    
    def get_assays(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Assay]:
        """Get all assays"""
        response = self._client.get(
            "/api/assays",
            params={"skip": skip, "limit": limit}
        )
        response.raise_for_status()
        return [Assay(**item) for item in response.json()]
    
    # Models
    def create_model(
        self,
        name: str,
        model_type: str,
        source_system: str,
        version: Optional[str] = None,
        description: Optional[str] = None
    ) -> Model:
        """Create a new model"""
        data = {
            "name": name,
            "model_type": model_type,
            "source_system": source_system,
            "version": version,
            "description": description
        }
        response = self._client.post("/api/models", json=data)
        response.raise_for_status()
        return Model(**response.json())
    
    def get_models(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Model]:
        """Get all models"""
        response = self._client.get(
            "/api/models",
            params={"skip": skip, "limit": limit}
        )
        response.raise_for_status()
        return [Model(**item) for item in response.json()]
    
    def get_model(self, model_id: str) -> Model:
        """Get a specific model by ID"""
        response = self._client.get(f"/api/models/{model_id}")
        response.raise_for_status()
        return Model(**response.json())
    
    def get_model_metrics(self, model_id: str) -> Dict[str, Any]:
        """Get accuracy metrics for a model"""
        response = self._client.get(f"/api/models/{model_id}/metrics")
        response.raise_for_status()
        return response.json()
    
    def retrain_model(
        self,
        model_id: str,
        model_type: str = "ridge"
    ) -> Dict[str, Any]:
        """Retrain a model"""
        response = self._client.post(
            f"/api/models/{model_id}/retrain",
            params={"model_type": model_type}
        )
        response.raise_for_status()
        return response.json()
    
    def delete_model(self, model_id: str) -> Dict[str, str]:
        """Delete a model"""
        response = self._client.delete(f"/api/models/{model_id}")
        response.raise_for_status()
        return response.json()
    
    # Predictions
    def create_prediction(
        self,
        model_id: str,
        molecule_id: str,
        predicted_value: float,
        value_type: str = "IC50",
        units: str = "μM",
        confidence_score: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Prediction:
        """Create a new prediction"""
        data = {
            "model_id": model_id,
            "molecule_id": molecule_id,
            "predicted_value": predicted_value,
            "value_type": value_type,
            "units": units,
            "confidence_score": confidence_score,
            "metadata_json": metadata
        }
        response = self._client.post("/api/predictions", json=data)
        response.raise_for_status()
        return Prediction(**response.json())
    
    def get_predictions(
        self,
        molecule_id: Optional[str] = None,
        model_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Prediction]:
        """Get predictions"""
        params = {"skip": skip, "limit": limit}
        if molecule_id:
            params["molecule_id"] = molecule_id
        if model_id:
            params["model_id"] = model_id
        
        response = self._client.get("/api/predictions", params=params)
        response.raise_for_status()
        return [Prediction(**item) for item in response.json()]
    
    # Experimental Results
    def create_experimental_result(
        self,
        molecule_id: str,
        assay_id: str,
        measured_value: float,
        value_type: str = "IC50",
        units: str = "μM",
        uncertainty: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ExperimentalResult:
        """Create a new experimental result"""
        data = {
            "molecule_id": molecule_id,
            "assay_id": assay_id,
            "measured_value": measured_value,
            "value_type": value_type,
            "units": units,
            "uncertainty": uncertainty,
            "metadata_json": metadata
        }
        response = self._client.post("/api/experimental-results", json=data)
        response.raise_for_status()
        return ExperimentalResult(**response.json())
    
    def get_experimental_results(
        self,
        molecule_id: Optional[str] = None,
        assay_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ExperimentalResult]:
        """Get experimental results"""
        params = {"skip": skip, "limit": limit}
        if molecule_id:
            params["molecule_id"] = molecule_id
        if assay_id:
            params["assay_id"] = assay_id
        
        response = self._client.get("/api/experimental-results", params=params)
        response.raise_for_status()
        return [ExperimentalResult(**item) for item in response.json()]
    
    # Sync
    def sync_benchling(
        self,
        assay_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sync experimental results from Benchling"""
        params = {}
        if assay_id:
            params["assay_id"] = assay_id
        
        response = self._client.post("/api/sync/benchling", params=params)
        response.raise_for_status()
        return response.json()
    
    def sync_moe(
        self,
        model_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sync predictions from MOE"""
        params = {}
        if model_id:
            params["model_id"] = model_id
        
        response = self._client.post("/api/sync/moe", params=params)
        response.raise_for_status()
        return response.json()
    
    # Drift Detection
    def check_drift(self, model_id: str) -> DriftCheck:
        """Check for drift in a model"""
        response = self._client.post(f"/api/drift/check/{model_id}")
        response.raise_for_status()
        return DriftCheck(**response.json())
    
    def get_drift_checks(
        self,
        model_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[DriftCheck]:
        """Get drift check history for a model"""
        response = self._client.get(
            f"/api/drift/checks/{model_id}",
            params={"skip": skip, "limit": limit}
        )
        response.raise_for_status()
        return [DriftCheck(**item) for item in response.json()]
    
    # Audit Logs (new)
    def get_audit_logs(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get audit logs"""
        params = {"skip": skip, "limit": limit}
        if entity_type:
            params["entity_type"] = entity_type
        if entity_id:
            params["entity_id"] = entity_id
        if action:
            params["action"] = action
        
        response = self._client.get("/api/audit-logs", params=params)
        response.raise_for_status()
        return response.json()


