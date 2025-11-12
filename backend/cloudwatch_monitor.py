"""
CloudWatch monitoring integration
"""
import os
import watchtower
import logging
from typing import Optional, Dict, Any
import boto3
from datetime import datetime


class CloudWatchMonitor:
    """Manages CloudWatch logging and metrics"""
    
    def __init__(
        self,
        log_group: Optional[str] = None,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        region_name: str = "us-east-1"
    ):
        """
        Initialize CloudWatch monitor
        
        Args:
            log_group: CloudWatch log group name
            aws_access_key_id: AWS access key
            aws_secret_access_key: AWS secret key
            region_name: AWS region
        """
        self.log_group = log_group or os.getenv("CLOUDWATCH_LOG_GROUP", "recalibra")
        self.region_name = region_name
        
        # Initialize CloudWatch client
        try:
            self.cloudwatch = boto3.client(
                'cloudwatch',
                aws_access_key_id=aws_access_key_id or os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=aws_secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=region_name
            )
            
            # Set up CloudWatch logging handler
            self.handler = watchtower.CloudWatchLogHandler(
                log_group=self.log_group,
                stream_name=f"recalibra-{datetime.utcnow().strftime('%Y%m%d')}",
                use_queues=False
            )
            
            # Configure logger
            self.logger = logging.getLogger("recalibra")
            self.logger.setLevel(logging.INFO)
            self.logger.addHandler(self.handler)
            
            self.enabled = True
        except Exception as e:
            print(f"Warning: CloudWatch not available: {e}")
            self.enabled = False
            self.logger = logging.getLogger("recalibra")
    
    def log_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "Count",
        dimensions: Optional[Dict[str, str]] = None
    ):
        """
        Log a custom metric to CloudWatch
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: Unit of measurement
            dimensions: Additional dimensions
        """
        if not self.enabled:
            return
        
        try:
            metric_data = {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Timestamp': datetime.utcnow(),
            }
            
            if dimensions:
                metric_data['Dimensions'] = [
                    {'Name': k, 'Value': v} for k, v in dimensions.items()
                ]
            
            self.cloudwatch.put_metric_data(
                Namespace='Recalibra',
                MetricData=[metric_data]
            )
        except Exception as e:
            print(f"Error logging metric to CloudWatch: {e}")
    
    def log_drift_check(
        self,
        model_id: str,
        drift_detected: bool,
        r_squared: float,
        rmse: float
    ):
        """Log drift check results"""
        self.log_metric(
            "DriftDetected",
            1 if drift_detected else 0,
            dimensions={"ModelId": model_id}
        )
        self.log_metric(
            "R2Score",
            r_squared,
            unit="None",
            dimensions={"ModelId": model_id}
        )
        self.log_metric(
            "RMSE",
            rmse,
            dimensions={"ModelId": model_id}
        )
        self.logger.info(
            f"Drift check: model_id={model_id}, drift_detected={drift_detected}, "
            f"r_squared={r_squared}, rmse={rmse}"
        )
    
    def log_sync(
        self,
        source: str,
        records_synced: int,
        success: bool
    ):
        """Log sync operation"""
        self.log_metric(
            "SyncRecords",
            records_synced,
            dimensions={"Source": source, "Success": str(success)}
        )
        self.logger.info(
            f"Sync: source={source}, records={records_synced}, success={success}"
        )
    
    def log_retraining(
        self,
        model_id: str,
        model_type: str,
        improvement: float
    ):
        """Log model retraining"""
        self.log_metric(
            "ModelRetrained",
            1,
            dimensions={"ModelId": model_id, "ModelType": model_type}
        )
        self.log_metric(
            "RetrainingImprovement",
            improvement,
            dimensions={"ModelId": model_id}
        )
        self.logger.info(
            f"Retraining: model_id={model_id}, type={model_type}, improvement={improvement}"
        )


# Global instance
try:
    cloudwatch_monitor = CloudWatchMonitor()
except Exception as e:
    print(f"Warning: CloudWatch monitor not available: {e}")
    cloudwatch_monitor = None








