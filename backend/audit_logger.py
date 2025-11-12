"""
Audit logging utility for FDA compliance tracking
"""

from sqlalchemy.orm import Session
from models import AuditLog
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request


class AuditLogger:
    """Utility class for creating audit logs"""
    
    @staticmethod
    def log(
        db: Session,
        entity_type: str,
        entity_id: str,
        action: str,
        request: Optional[Request] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Create an audit log entry
        
        Args:
            db: Database session
            entity_type: Type of entity ('molecule', 'model', 'prediction', etc.)
            entity_id: ID of the entity
            action: Action performed ('create', 'update', 'delete', 'sync', etc.)
            request: FastAPI request object (for IP address extraction)
            user_id: Optional user ID
            user_email: Optional user email
            changes: Optional dict with 'before' and 'after' keys for updates
            metadata: Optional additional metadata
        """
        # Extract IP address from request
        ip_address = None
        if request:
            # Try to get real IP (behind proxy)
            ip_address = (
                request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or
                request.headers.get("X-Real-IP") or
                request.client.host if request.client else None
            )
        
        # Build metadata
        log_metadata = metadata or {}
        if request:
            log_metadata.update({
                "method": request.method,
                "url": str(request.url),
                "user_agent": request.headers.get("User-Agent"),
            })
        
        audit_log = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            changes=changes,
            metadata_json=log_metadata,
            timestamp=datetime.utcnow()
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
    
    @staticmethod
    def log_create(
        db: Session,
        entity_type: str,
        entity_id: str,
        request: Optional[Request] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log a create action"""
        return AuditLogger.log(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            action="create",
            request=request,
            user_id=user_id,
            user_email=user_email,
            metadata=metadata
        )
    
    @staticmethod
    def log_update(
        db: Session,
        entity_type: str,
        entity_id: str,
        before: Dict[str, Any],
        after: Dict[str, Any],
        request: Optional[Request] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log an update action with before/after values"""
        changes = {
            "before": before,
            "after": after
        }
        return AuditLogger.log(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            action="update",
            request=request,
            user_id=user_id,
            user_email=user_email,
            changes=changes,
            metadata=metadata
        )
    
    @staticmethod
    def log_delete(
        db: Session,
        entity_type: str,
        entity_id: str,
        request: Optional[Request] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log a delete action"""
        return AuditLogger.log(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            action="delete",
            request=request,
            user_id=user_id,
            user_email=user_email,
            metadata=metadata
        )
    
    @staticmethod
    def log_sync(
        db: Session,
        source: str,
        entity_type: str,
        entity_id: str,
        count: int,
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log a sync action"""
        sync_metadata = {
            "source": source,
            "count": count,
            **(metadata or {})
        }
        return AuditLogger.log(
            db=db,
            entity_type=entity_type,
            entity_id=entity_id,
            action="sync",
            request=request,
            metadata=sync_metadata
        )
    
    @staticmethod
    def log_drift_check(
        db: Session,
        model_id: str,
        drift_detected: bool,
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log a drift check"""
        drift_metadata = {
            "drift_detected": drift_detected,
            **(metadata or {})
        }
        return AuditLogger.log(
            db=db,
            entity_type="drift_check",
            entity_id=model_id,
            action="drift_check",
            request=request,
            metadata=drift_metadata
        )
    
    @staticmethod
    def log_retrain(
        db: Session,
        model_id: str,
        metrics: Dict[str, Any],
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log a model retraining"""
        retrain_metadata = {
            "metrics": metrics,
            **(metadata or {})
        }
        return AuditLogger.log(
            db=db,
            entity_type="model",
            entity_id=model_id,
            action="retrain",
            request=request,
            metadata=retrain_metadata
        )

