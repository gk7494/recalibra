#!/usr/bin/env python3
"""
Demo setup script - prepares the system for a smooth demo
This script:
1. Syncs Benchling (creates mock assay results)
2. Ingests MOE CSV (creates predictions)
3. Ensures models exist
4. Runs a drift check
5. Shows the system is ready
"""
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_step(step_num, message):
    print(f"\n{'='*60}")
    print(f"STEP {step_num}: {message}")
    print('='*60)

def check_backend():
    """Check if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
    except Exception as e:
        print(f"❌ Backend not reachable: {e}")
        print(f"   Make sure backend is running on {BASE_URL}")
        return False
    return False

def sync_benchling():
    """Sync Benchling data"""
    print_step(1, "Syncing Benchling")
    try:
        response = requests.post(f"{BASE_URL}/api/sync/benchling?limit=20", timeout=30)
        if response.status_code == 200:
            data = response.json()
            synced = data.get('synced_count', 0)
            print(f"✅ Synced {synced} assay results from Benchling API")
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error syncing Benchling: {e}")
        return False

def ingest_moe():
    """Ingest MOE CSV"""
    print_step(2, "Ingesting MOE Predictions")
    csv_path = Path(__file__).parent / "sample_moe_predictions.csv"
    
    if not csv_path.exists():
        print(f"❌ MOE CSV not found: {csv_path}")
        return False
    
    try:
        with open(csv_path, 'rb') as f:
            files = {'file': ('moe_predictions.csv', f, 'text/csv')}
            response = requests.post(f"{BASE_URL}/api/ingest/moe", files=files, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            ingested = data.get('ingested_count', 0)
            print(f"✅ Synced {ingested} predictions from MOE")
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error ingesting MOE: {e}")
        return False

def get_models():
    """Get all models"""
    try:
        response = requests.get(f"{BASE_URL}/api/models", timeout=10)
        if response.status_code == 200:
            models = response.json()
            print(f"✅ Found {len(models)} models")
            return models
        return []
    except Exception as e:
        print(f"❌ Error getting models: {e}")
        return []

def check_drift(model_id):
    """Run drift check on a model"""
    print_step(3, f"Checking Drift for Model {model_id[:8]}...")
    try:
        response = requests.post(f"{BASE_URL}/api/models/{model_id}/check_drift", timeout=30)
        if response.status_code == 200:
            data = response.json()
            drift = data.get('drift_detected', False)
            psi = data.get('psi', 0)
            ks_p = data.get('ks_p', 1.0)
            print(f"✅ Drift check completed")
            print(f"   Drift detected: {'YES' if drift else 'NO'}")
            print(f"   PSI: {psi:.3f}")
            print(f"   KS p-value: {ks_p:.3f}")
            return True
        else:
            print(f"⚠️  Drift check returned: {response.status_code}")
            print(f"   {response.text[:200]}")
            return False
    except Exception as e:
        print(f"⚠️  Error checking drift: {e}")
        return False

def get_metrics(model_id):
    """Get model metrics"""
    try:
        response = requests.get(f"{BASE_URL}/api/models/{model_id}/metrics", timeout=10)
        if response.status_code == 200:
            metrics = response.json()
            r2 = metrics.get('r_squared', 0)
            rmse = metrics.get('rmse', 0)
            mae = metrics.get('mae', 0)
            print(f"   R²: {r2:.3f}")
            print(f"   RMSE: {rmse:.3f}")
            print(f"   MAE: {mae:.3f}")
            return metrics
        return None
    except Exception as e:
        print(f"⚠️  Error getting metrics: {e}")
        return None

def main():
    print("\n" + "="*60)
    print("🚀 RECALIBRA DEMO SETUP")
    print("="*60)
    
    # Check backend
    if not check_backend():
        print("\n❌ Cannot proceed - backend not running")
        print("   Run: cd backend && ./start_backend.sh")
        return False
    
    # Sync Benchling
    if not sync_benchling():
        print("\n⚠️  Benchling sync failed, but continuing...")
    
    # Ingest MOE
    if not ingest_moe():
        print("\n⚠️  MOE ingestion failed, but continuing...")
    
    # Get models
    models = get_models()
    if not models:
        print("\n⚠️  No models found")
        return False
    
    # Check drift and show metrics for first model
    model = models[0]
    model_id = model['id']
    
    print_step(4, f"Model Metrics: {model['name']}")
    metrics = get_metrics(model_id)
    
    # Check drift
    check_drift(model_id)
    
    # Final summary
    print("\n" + "="*60)
    print("✅ DEMO SETUP COMPLETE!")
    print("="*60)
    print("\n📊 System Status:")
    print(f"   • Models: {len(models)}")
    print(f"   • Ready for drift detection")
    print(f"   • Ready for model retraining")
    print("\n🎯 Next Steps for Demo:")
    print("   1. Open http://localhost:3000")
    print("   2. Go to Dashboard to see metrics")
    print("   3. Go to Models page to retrain")
    print("   4. Go to Drift Checks to see drift history")
    print("\n" + "="*60 + "\n")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

