"""
MLflow integration for model versioning and tracking
"""
import os
import mlflow
import mlflow.sklearn
import mlflow.pytorch
import pickle
from typing import Dict, Any, Optional
from datetime import datetime


class MLflowManager:
    """Manages MLflow tracking for model versioning"""
    
    def __init__(self, tracking_uri: Optional[str] = None):
        """
        Initialize MLflow manager
        
        Args:
            tracking_uri: MLflow tracking URI (defaults to local file store)
        """
        self.tracking_uri = tracking_uri or os.getenv(
            "MLFLOW_TRACKING_URI",
            "file:./mlruns"
        )
        mlflow.set_tracking_uri(self.tracking_uri)
        self.experiment_name = os.getenv("MLFLOW_EXPERIMENT_NAME", "recalibra")
        self._ensure_experiment()
    
    def _ensure_experiment(self):
        """Ensure experiment exists"""
        try:
            experiment = mlflow.get_experiment_by_name(self.experiment_name)
            if experiment is None:
                mlflow.create_experiment(self.experiment_name)
        except Exception as e:
            print(f"Warning: Could not create MLflow experiment: {e}")
    
    def log_model_retraining(
        self,
        model_id: str,
        model_name: str,
        model_type: str,
        metrics: Dict[str, float],
        model_object: Any,
        model_type_library: str = "sklearn",
        artifact_path: str = "model",
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Log a retrained model to MLflow
        
        Args:
            model_id: Internal model ID
            model_name: Human-readable model name
            model_type: Type of model (ridge, rf, neural, etc.)
            metrics: Dictionary of metrics (rmse, mae, r_squared, etc.)
            model_object: The trained model object
            model_type_library: Library type ('sklearn', 'pytorch', 'xgboost')
            artifact_path: Path to store artifacts
            metadata: Additional metadata to log
        
        Returns:
            MLflow run ID
        """
        mlflow.set_experiment(self.experiment_name)
        
        with mlflow.start_run(run_name=f"{model_name}_{datetime.utcnow().isoformat()}"):
            # Log parameters
            mlflow.log_params({
                "model_id": model_id,
                "model_name": model_name,
                "model_type": model_type,
                "library": model_type_library,
            })
            
            # Log metrics
            mlflow.log_metrics(metrics)
            
            # Log model
            if model_type_library == "sklearn":
                mlflow.sklearn.log_model(model_object, artifact_path)
            elif model_type_library == "pytorch":
                mlflow.pytorch.log_model(model_object, artifact_path)
            elif model_type_library == "xgboost":
                import mlflow.xgboost
                mlflow.xgboost.log_model(model_object, artifact_path)
            else:
                # Generic pickle logging
                with open("model.pkl", "wb") as f:
                    pickle.dump(model_object, f)
                mlflow.log_artifact("model.pkl", artifact_path)
            
            # Log metadata
            if metadata:
                mlflow.log_dict(metadata, "metadata.json")
            
            # Log tags
            mlflow.set_tags({
                "model_id": model_id,
                "model_type": model_type,
                "retrained_at": datetime.utcnow().isoformat(),
            })
            
            run_id = mlflow.active_run().info.run_id
            return run_id
    
    def log_correction_layer(
        self,
        model_id: str,
        correction_model: Any,
        metrics: Dict[str, float],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Log a correction layer for closed systems
        
        Args:
            model_id: Internal model ID
            correction_model: The correction model (usually Ridge)
            metrics: Performance metrics
            metadata: Additional metadata
        
        Returns:
            MLflow run ID
        """
        return self.log_model_retraining(
            model_id=model_id,
            model_name=f"CorrectionLayer_{model_id}",
            model_type="correction_layer",
            metrics=metrics,
            model_object=correction_model,
            model_type_library="sklearn",
            artifact_path="correction_layer",
            metadata=metadata
        )
    
    def get_latest_model(self, model_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the latest version of a model from MLflow
        
        Args:
            model_id: Internal model ID
        
        Returns:
            Dictionary with model info and run ID, or None if not found
        """
        try:
            experiment = mlflow.get_experiment_by_name(self.experiment_name)
            if experiment is None:
                return None
            
            # Search for runs with this model_id
            runs = mlflow.search_runs(
                experiment_ids=[experiment.experiment_id],
                filter_string=f"tags.model_id = '{model_id}'",
                order_by=["start_time DESC"],
                max_results=1
            )
            
            if runs.empty:
                return None
            
            run = runs.iloc[0]
            return {
                "run_id": run["run_id"],
                "metrics": {
                    "rmse": run.get("metrics.rmse"),
                    "mae": run.get("metrics.mae"),
                    "r_squared": run.get("metrics.r_squared"),
                },
                "params": {
                    "model_type": run.get("params.model_type"),
                    "library": run.get("params.library"),
                },
                "start_time": run["start_time"],
            }
        except Exception as e:
            print(f"Error getting latest model from MLflow: {e}")
            return None
    
    def load_model(self, run_id: str, artifact_path: str = "model"):
        """
        Load a model from MLflow
        
        Args:
            run_id: MLflow run ID
            artifact_path: Path to the model artifact
        
        Returns:
            Loaded model object
        """
        model_uri = f"runs:/{run_id}/{artifact_path}"
        
        # Try different model flavors
        try:
            return mlflow.sklearn.load_model(model_uri)
        except:
            try:
                return mlflow.pytorch.load_model(model_uri)
            except:
                try:
                    import mlflow.xgboost
                    return mlflow.xgboost.load_model(model_uri)
                except:
                    # Fallback to generic load
                    return mlflow.pyfunc.load_model(model_uri)


# Global instance
mlflow_manager = MLflowManager()








