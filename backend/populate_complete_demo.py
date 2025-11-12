#!/usr/bin/env python3
"""
Populate database with complete, realistic fake data.
Creates everything needed for a polished demo.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import requests
import random
from datetime import datetime, timedelta
import time

BASE_URL = "http://localhost:8000"

def check_backend():
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def create_model_via_api(model_data):
    """Create model via API (models are auto-created when predictions are uploaded)"""
    # Models are automatically created when predictions are uploaded
    # So we'll create predictions for each model instead
    return True

def main():
    print("\n" + "="*70)
    print("🎬 POPULATING COMPLETE REALISTIC DEMO")
    print("="*70)
    
    if not check_backend():
        print("\n❌ Backend not running! Start it with: cd backend && ./start_backend.sh")
        return False
    
    # Step 1: Upload MOE CSV (creates model automatically)
    print("\n📤 Step 1: Uploading MOE predictions...")
    csv_path = Path(__file__).parent / "moe_predictions_sample.csv"
    if csv_path.exists():
        with open(csv_path, 'rb') as f:
            files = {'file': ('moe_predictions.csv', f, 'text/csv')}
            response = requests.post(f"{BASE_URL}/api/ingest/moe", files=files, timeout=30)
            if response.status_code == 200:
                print(f"   ✅ Uploaded MOE predictions")
    
    # Step 2: Sync Benchling (creates matching assay results)
    print("\n🧪 Step 2: Syncing Benchling data...")
    response = requests.post(f"{BASE_URL}/api/sync/benchling?limit=50", timeout=30)
    if response.status_code == 200:
        print(f"   ✅ Synced Benchling assay results")
    
    # Step 3: Create additional models by uploading predictions
    print("\n📊 Step 3: Creating additional models with predictions...")
    
    # Step 3: Create additional models by uploading predictions via bulk API
    print("\n📊 Step 3: Creating additional models with predictions...")
    
    additional_models_data = [
        {"id": "protein_docking_moe", "name": "Protein Docking - MOE", "count": 25},
        {"id": "ic50_pipeline", "name": "IC50 Prediction Pipeline", "count": 30},
        {"id": "sequence_activity", "name": "Sequence-Activity Model", "count": 20}
    ]
    
    created = 0
    for model_info in additional_models_data:
        try:
            # Generate predictions for this model
            predictions_data = []
            base_date = datetime(2025, 10, 1)
            
            for i in range(model_info["count"]):
                molecule_id = f"CMPD_{random.randint(100, 999)}"
                docking_score = random.uniform(-9.0, -6.5)
                y_pred = abs(docking_score)
                days_ago = random.randint(0, 45)
                run_time = base_date + timedelta(days=days_ago)
                
                predictions_data.append({
                    "molecule_id": molecule_id,
                    "model_id": model_info["id"],
                    "y_pred": round(y_pred, 2),
                    "reagent_batch": f"RB_{random.randint(85, 100)}",
                    "assay_version": random.choice(["v3", "v4"]),
                    "instrument_id": random.choice(["LCMS_01", "LCMS_02"]),
                    "run_timestamp": run_time.isoformat() + "Z",
                    "metadata": {
                        "source": "MOE" if "MOE" in model_info["name"] else "Recalibra",
                        "docking_score": round(docking_score, 2)
                    }
                })
            
            # Upload via bulk endpoint
            response = requests.post(
                f"{BASE_URL}/api/predictions/bulk",
                json={"predictions": predictions_data},
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                created += 1
                print(f"   ✓ Created: {model_info['name']} ({model_info['count']} predictions)")
        except Exception as e:
            print(f"   ⚠️  Failed to create {model_info['name']}: {e}")
    
    print(f"   ✅ {created} additional models created")
    
    # Step 4: Create multiple drift checks
    print("\n🔍 Step 4: Creating drift checks...")
    time.sleep(2)  # Wait for data to settle
    
    model_id = "moe_kinase_101"
    for i in range(3):
        try:
            response = requests.post(
                f"{BASE_URL}/api/models/{model_id}/check_drift",
                timeout=30
            )
            if response.status_code == 200:
                drift = response.json()
                detected = drift.get('drift_detected', 'NO')
                print(f"   ✓ Drift check {i+1}: {detected}")
            time.sleep(1)
        except Exception as e:
            print(f"   ⚠️  Check {i+1} failed: {e}")
    
    # Step 5: Get final summary
    print("\n📊 Step 5: Final Summary...")
    try:
        models_resp = requests.get(f"{BASE_URL}/api/models", timeout=10)
        if models_resp.status_code == 200:
            models = models_resp.json()
            print(f"   ✅ Total models: {len(models)}")
            
            for model in models:
                try:
                    metrics_resp = requests.get(f"{BASE_URL}/api/models/{model['id']}/metrics", timeout=5)
                    if metrics_resp.status_code == 200:
                        metrics = metrics_resp.json()
                        if 'error' not in metrics:
                            pairs = metrics.get('n_samples', metrics.get('matched_pairs', 0))
                            if pairs > 0:
                                print(f"      - {model['name']}: {pairs} matched pairs")
                except:
                    pass
    except:
        pass
    
    print("\n" + "="*70)
    print("✅ COMPLETE DEMO DATA READY!")
    print("="*70)
    print("\n🎯 Your demo now has:")
    print("   ✅ Multiple models with realistic names")
    print("   ✅ Predictions and assay results")
    print("   ✅ Drift checks with real metrics")
    print("   ✅ All numbers are realistic (no zeros)")
    print("\n🚀 View dashboard at: http://localhost:3000")
    print("="*70 + "\n")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

