"""
Background tasks for automatic drift detection and monitoring
"""

import asyncio
import os
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database import SessionLocal
from models import Model, Prediction, ExperimentalResult, DriftCheck
from drift_detection import DriftDetector
from audit_logger import AuditLogger


class BackgroundTaskManager:
    """Manages background tasks for automatic drift detection"""
    
    def __init__(self):
        self.drift_detector = DriftDetector()
        self.running = False
        self.task = None
    
    async def check_all_models_for_drift(self):
        """Check all models for drift automatically"""
        db = SessionLocal()
        try:
            # Get all models
            models = db.query(Model).all()
            
            for model in models:
                try:
                    # Get predictions and experimental results
                    predictions = db.query(Prediction).filter(
                        Prediction.model_id == model.id
                    ).all()
                    
                    if not predictions:
                        continue
                    
                    molecule_ids = [p.molecule_id for p in predictions]
                    results = db.query(ExperimentalResult).filter(
                        ExperimentalResult.molecule_id.in_(molecule_ids)
                    ).all()
                    
                    if not results or len(results) < 10:
                        continue
                    
                    # Match predictions to results
                    pred_dict = {p.molecule_id: p.predicted_value for p in predictions}
                    result_dict = {r.molecule_id: r.measured_value for r in results}
                    
                    matched_predictions = []
                    matched_results = []
                    
                    for mol_id in pred_dict.keys():
                        if mol_id in result_dict:
                            matched_predictions.append(pred_dict[mol_id])
                            matched_results.append(result_dict[mol_id])
                    
                    if len(matched_predictions) < 10:
                        continue
                    
                    # Check if we've run a drift check recently (within last hour)
                    recent_check = db.query(DriftCheck).filter(
                        DriftCheck.model_id == model.id,
                        DriftCheck.check_timestamp >= datetime.utcnow() - timedelta(hours=1)
                    ).first()
                    
                    if recent_check:
                        continue  # Skip if checked recently
                    
                    # Run drift detection
                    drift_results = self.drift_detector.detect_drift(
                        predictions=matched_predictions,
                        actuals=matched_results
                    )
                    
                    # Store drift check
                    import numpy as np
                    details_clean = {}
                    for k, v in drift_results.items():
                        if isinstance(v, (np.integer, np.floating)):
                            details_clean[k] = float(v)
                        elif isinstance(v, (np.bool_, bool)):
                            details_clean[k] = bool(v)
                        elif isinstance(v, (int, float)):
                            details_clean[k] = float(v)
                        elif v is None:
                            details_clean[k] = None
                        else:
                            details_clean[k] = str(v)
                    
                    drift_check = DriftCheck(
                        model_id=model.id,
                        check_timestamp=datetime.utcnow(),
                        drift_detected=bool(drift_results["drift_detected"]),
                        ks_statistic=float(drift_results.get("ks_statistic", 0)),
                        psi_value=float(drift_results.get("psi_value", 0)),
                        kl_divergence=float(drift_results.get("kl_divergence", 0)) if drift_results.get("kl_divergence") is not None else None,
                        rmse=float(drift_results.get("rmse", 0)),
                        mae=float(drift_results.get("mae", 0)),
                        r_squared=float(drift_results.get("r_squared", 0)),
                        details=details_clean
                    )
                    db.add(drift_check)
                    
                    # Log audit
                    AuditLogger.log_drift_check(
                        db=db,
                        model_id=model.id,
                        drift_detected=bool(drift_results["drift_detected"]),
                        request=None,
                        metadata={
                            "ks_statistic": float(drift_results.get("ks_statistic", 0)),
                            "r_squared": float(drift_results.get("r_squared", 0)),
                            "rmse": float(drift_results.get("rmse", 0)),
                            "triggered_by": "background_task"
                        }
                    )
                    
                    db.commit()
                    
                    # Broadcast via WebSocket (if available)
                    try:
                        from websocket_manager import manager as ws_manager
                        await ws_manager.broadcast_drift_check(
                            model_id=model.id,
                            drift_detected=bool(drift_results["drift_detected"]),
                            metrics={
                                "ks_statistic": float(drift_results.get("ks_statistic", 0)),
                                "r_squared": float(drift_results.get("r_squared", 0)),
                                "rmse": float(drift_results.get("rmse", 0)),
                                "mae": float(drift_results.get("mae", 0))
                            }
                        )
                    except Exception as ws_error:
                        print(f"⚠️  Could not broadcast WebSocket message: {ws_error}")
                    
                    print(f"✅ Background drift check completed for model {model.id}: drift_detected={drift_results['drift_detected']}")
                    
                except Exception as e:
                    print(f"❌ Error checking drift for model {model.id}: {e}")
                    db.rollback()
                    continue
                    
        finally:
            db.close()
    
    async def run_periodic_checks(self, interval_minutes: int = 60):
        """Run periodic drift checks"""
        self.running = True
        while self.running:
            try:
                await self.check_all_models_for_drift()
            except Exception as e:
                print(f"❌ Error in background task: {e}")
            
            # Wait for next interval
            await asyncio.sleep(interval_minutes * 60)
    
    def start(self, interval_minutes: int = 60):
        """Start background task"""
        if self.running:
            return
        
        self.task = asyncio.create_task(self.run_periodic_checks(interval_minutes))
        print(f"✅ Background drift detection started (interval: {interval_minutes} minutes)")
    
    def stop(self):
        """Stop background task"""
        self.running = False
        if self.task:
            self.task.cancel()
        print("✅ Background drift detection stopped")


# Global instance
background_task_manager = BackgroundTaskManager()

