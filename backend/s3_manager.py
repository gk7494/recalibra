"""
AWS S3 integration for storing model artifacts and data
"""
import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO, Dict, Any
import json
import pickle


class S3Manager:
    """Manages AWS S3 operations for storing artifacts"""
    
    def __init__(
        self,
        bucket_name: Optional[str] = None,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        region_name: str = "us-east-1"
    ):
        """
        Initialize S3 manager
        
        Args:
            bucket_name: S3 bucket name (defaults to env var)
            aws_access_key_id: AWS access key (defaults to env var)
            aws_secret_access_key: AWS secret key (defaults to env var)
            region_name: AWS region
        """
        self.bucket_name = bucket_name or os.getenv("AWS_S3_BUCKET", "recalibra-artifacts")
        self.region_name = region_name
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id or os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=aws_secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=region_name
        )
    
    def upload_model(
        self,
        model_object: Any,
        model_id: str,
        model_type: str,
        version: str = "latest",
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Upload a model artifact to S3
        
        Args:
            model_object: The model object to serialize
            model_id: Model identifier
            model_type: Type of model
            version: Model version
            metadata: Additional metadata
        
        Returns:
            S3 key/path of uploaded model
        """
        key = f"models/{model_id}/{model_type}/{version}/model.pkl"
        
        # Serialize model
        model_bytes = pickle.dumps(model_object)
        
        # Upload to S3
        extra_args = {
            "ContentType": "application/octet-stream"
        }
        if metadata:
            extra_args["Metadata"] = {k: str(v) for k, v in metadata.items()}
        
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=model_bytes,
            **extra_args
        )
        
        # Upload metadata as JSON
        if metadata:
            metadata_key = f"models/{model_id}/{model_type}/{version}/metadata.json"
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=metadata_key,
                Body=json.dumps(metadata).encode('utf-8'),
                ContentType="application/json"
            )
        
        return key
    
    def download_model(self, model_id: str, model_type: str, version: str = "latest") -> Optional[Any]:
        """
        Download a model from S3
        
        Args:
            model_id: Model identifier
            model_type: Type of model
            version: Model version
        
        Returns:
            Deserialized model object, or None if not found
        """
        key = f"models/{model_id}/{model_type}/{version}/model.pkl"
        
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            model_bytes = response['Body'].read()
            return pickle.loads(model_bytes)
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return None
            raise
    
    def upload_data(
        self,
        data: bytes,
        path: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        Upload arbitrary data to S3
        
        Args:
            data: Data bytes
            path: S3 path/key
            content_type: Content type
        
        Returns:
            S3 key/path
        """
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=path,
            Body=data,
            ContentType=content_type
        )
        return path
    
    def list_models(self, model_id: Optional[str] = None) -> list:
        """
        List all models in S3
        
        Args:
            model_id: Optional model ID to filter
        
        Returns:
            List of model paths
        """
        prefix = f"models/{model_id}/" if model_id else "models/"
        
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            if 'Contents' not in response:
                return []
            
            return [obj['Key'] for obj in response['Contents']]
        except ClientError:
            return []


# Global instance (only if AWS credentials are available)
try:
    s3_manager = S3Manager()
except Exception as e:
    print(f"Warning: S3 not available: {e}")
    s3_manager = None








