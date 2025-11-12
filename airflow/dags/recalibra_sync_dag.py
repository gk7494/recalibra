"""
Airflow DAG for periodic Recalibra data syncing
"""
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
import requests
import os

# Default arguments
default_args = {
    'owner': 'recalibra',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

# DAG definition
dag = DAG(
    'recalibra_sync',
    default_args=default_args,
    description='Periodic sync of Benchling and MOE data',
    schedule_interval=timedelta(hours=1),  # Run every hour
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['recalibra', 'sync', 'data'],
)

API_URL = os.getenv("RECALIBRA_API_URL", "http://localhost:8000")


def sync_benchling(**context):
    """Sync data from Benchling"""
    try:
        response = requests.post(f"{API_URL}/api/sync/benchling")
        response.raise_for_status()
        print(f"✅ Benchling sync successful: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"❌ Benchling sync failed: {e}")
        raise


def sync_moe(**context):
    """Sync data from MOE"""
    try:
        response = requests.post(f"{API_URL}/api/sync/moe")
        response.raise_for_status()
        print(f"✅ MOE sync successful: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"❌ MOE sync failed: {e}")
        raise


def check_drift(**context):
    """Check for drift in all models"""
    try:
        # Get all models
        models_response = requests.get(f"{API_URL}/api/models")
        models = models_response.json()
        
        for model in models:
            model_id = model['id']
            try:
                response = requests.post(f"{API_URL}/api/drift/check/{model_id}")
                response.raise_for_status()
                drift_result = response.json()
                print(f"✅ Drift check for {model['name']}: drift_detected={drift_result.get('drift_detected')}")
            except Exception as e:
                print(f"⚠️  Drift check failed for {model['name']}: {e}")
        
        return "Drift checks completed"
    except Exception as e:
        print(f"❌ Drift check failed: {e}")
        raise


# Define tasks
sync_benchling_task = PythonOperator(
    task_id='sync_benchling',
    python_callable=sync_benchling,
    dag=dag,
)

sync_moe_task = PythonOperator(
    task_id='sync_moe',
    python_callable=sync_moe,
    dag=dag,
)

check_drift_task = PythonOperator(
    task_id='check_drift',
    python_callable=check_drift,
    dag=dag,
)

# Set task dependencies
sync_benchling_task >> sync_moe_task >> check_drift_task








