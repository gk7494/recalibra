#!/usr/bin/env python3
"""
Populate database with complete, realistic fake data for demo.
Creates multiple models, predictions, assay results, and drift checks.
"""

import sys
import requests
import random
from datetime import datetime, timedelta
from pathlib import Path

BASE_URL = "http://localhost:8000"

def check_backend():
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def create_models():
    """Create multiple realistic models"""
    print("\n📊 Creating models...")
    models = [
        {
            "id": "moe_kinase_101",
            "name": "MOE Kinase Inhibitor Model",
            "model_type": "closed",
            "source_system": "MOE",
            "version": "2.1",
            "description": "Docking-based kinase inhibitor activity prediction"
        },
        {
            "id": "protein_docking_moe",
            "name": "Protein Docking - MOE",
            "model_type": "closed",
            "source_system": "MOE",
            "version": "1.8",
            "description": "Protein-ligand docking score prediction"
        },
        {
            "id": "ic50_pipeline",
            "name": "IC50 Prediction Pipeline",
            "model_type": "open",
            "source_system": "Recalibra",
            "version": "3.2",
            "description": "Activity prediction using ensemble methods"
        },
        {
            "id": "sequence_activity",
            "name": "Sequence-Activity Model",
            "model_type": "open",
            "source_system": "Recalibra",
            "version": "1.5",
            "description": "Regression model for sequence-based activity"
        },
        {
            "id": "crispr_efficiency",
            "name": "CRISPR Efficiency Predictor",
            "model_type": "open",
            "source_system": "Recalibra",
            "version": "2.0",
            "description": "Classification model for CRISPR editing efficiency"
        }
    ]
    
    created = 0
    for model_data in models:
        try:
            # Check if model exists
            response = requests.get(f"{BASE_URL}/api/models/{model_data['id']}", timeout=5)
            if response.status_code == 200:
                print(f"   ✓ {model_data['name']} already exists")
                continue
            
            # Create model
            response = requests.post(f"{BASE_URL}/api/models", json=model_data, timeout=10)
            if response.status_code in [200, 201]:
                created += 1
                print(f"   ✓ Created: {model_data['name']}")
        except:
            pass
    
    print(f"   ✅ {created} new models created")
    return models

def generate_predictions(model_id, count=50):
    """Generate realistic predictions for a model"""
    predictions = []
    base_date = datetime(2025, 10, 1)
    
    for i in range(count):
        molecule_id = f"CMPD_{i+1:03d}"
        
        # Generate realistic docking score (negative, typically -5 to -10)
        docking_score = random.uniform(-9.5, -6.0)
        y_pred = abs(docking_score)  # Convert to positive IC50 estimate
        
        # Vary timestamps over last 2 months
        days_ago = random.randint(0, 60)
        run_time = base_date + timedelta(days=days_ago, hours=random.randint(8, 18))
        
        predictions.append({
            "molecule_id": molecule_id,
            "model_id": model_id,
            "y_pred": round(y_pred, 2),
            "reagent_batch": f"RB_{random.randint(85, 100)}",
            "assay_version": random.choice(["v3", "v4", "v5"]),
            "instrument_id": random.choice(["LCMS_01", "LCMS_02", "LCMS_03"]),
            "run_timestamp": run_time.isoformat() + "Z",
            "metadata_json": {
                "source": "MOE",
                "docking_score": round(docking_score, 2),
                "confidence": round(random.uniform(0.65, 0.95), 3)
            }
        })
    
    return predictions

def generate_assay_results(model_id, predictions, count=50):
    """Generate matching assay results with realistic drift"""
    results = []
    base_date = datetime(2025, 10, 1)
    
    for i, pred in enumerate(predictions[:count]):
        molecule_id = pred["molecule_id"]
        pred_value = pred["y_pred"]
        
        # Create drift pattern: older data has more drift
        days_ago = (datetime.utcnow() - datetime.fromisoformat(pred["run_timestamp"].replace("Z", ""))).days
        
        if days_ago > 30:
            # Older data: significant drift (+20-35%)
            drift_factor = 1.0 + random.uniform(0.20, 0.35)
            noise = random.uniform(-0.15, 0.15)
        elif days_ago > 15:
            # Medium age: moderate drift (+10-20%)
            drift_factor = 1.0 + random.uniform(0.10, 0.20)
            noise = random.uniform(-0.12, 0.12)
        else:
            # Recent data: good fit (±8%)
            drift_factor = 1.0 + random.uniform(-0.03, 0.03)
            noise = random.uniform(-0.08, 0.08)
        
        ic50 = pred_value * drift_factor * (1 + noise)
        ic50 = round(max(0.1, ic50), 2)
        
        run_time = datetime.fromisoformat(pred["run_timestamp"].replace("Z", ""))
        
        results.append({
            "benchling_id": f"benchling_{random.randint(10000, 99999)}",
            "molecule_id": molecule_id,
            "y_true": ic50,
            "assay_version": pred.get("assay_version", "v4"),
            "reagent_batch": pred.get("reagent_batch", f"RB_{random.randint(85, 100)}"),
            "instrument_id": pred.get("instrument_id", "LCMS_01"),
            "operator": f"operator_{random.randint(1, 5)}",
            "run_timestamp": run_time.isoformat() + "Z",
            "metadata_json": {
                "source": "benchling",
                "uncertainty": round(random.uniform(0.18, 0.42), 3),
                "plate_id": f"PLATE_{random.randint(1, 10)}",
                "well_position": f"{chr(65 + random.randint(0, 7))}{random.randint(1, 12)}"
            }
        })
    
    return results

def upload_predictions_bulk(predictions):
    """Upload predictions via bulk endpoint"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/predictions/bulk",
            json={"predictions": predictions},
            timeout=30
        )
        return response.status_code in [200, 201]
    except:
        return False

def upload_assay_results_bulk(results):
    """Upload assay results via bulk endpoint"""
    try:
        assay_data = [{
            "molecule_id": r["molecule_id"],
            "assay_id": r["benchling_id"],
            "observed_value": r["y_true"],
            "run_at": r["run_timestamp"],
            "metadata": {
                "assay_version": r.get("assay_version"),
                "reagent_batch": r.get("reagent_batch"),
                "instrument_id": r.get("instrument_id"),
                "operator": r.get("operator"),
                **r.get("metadata_json", {})
            }
        } for r in results]
        
        response = requests.post(
            f"{BASE_URL}/api/assay-results/bulk",
            json={"assay_results": assay_data},
            timeout=30
        )
        return response.status_code in [200, 201]
    except:
        return False

def create_drift_checks(model_id, count=5):
    """Create historical drift checks"""
    print(f"\n🔍 Creating drift checks for {model_id}...")
    
    for i in range(count):
        try:
            response = requests.post(
                f"{BASE_URL}/api/models/{model_id}/check_drift",
                timeout=30
            )
            if response.status_code == 200:
                print(f"   ✓ Drift check {i+1}/{count} completed")
            time.sleep(1)  # Space out checks
        except:
            pass

def main():
    print("\n" + "="*70)
    print("🎬 POPULATING REALISTIC DEMO DATA")
    print("="*70)
    
    if not check_backend():
        print("\n❌ Backend not running! Start it with: cd backend && ./start_backend.sh")
        return False
    
    # Step 1: Create models
    models = create_models()
    
    # Step 2: Upload MOE CSV for main model
    print("\n📤 Uploading MOE predictions...")
    csv_path = Path(__file__).parent / "moe_predictions_sample.csv"
    if csv_path.exists():
        with open(csv_path, 'rb') as f:
            files = {'file': ('moe_predictions.csv', f, 'text/csv')}
            response = requests.post(f"{BASE_URL}/api/ingest/moe", files=files, timeout=30)
            if response.status_code == 200:
                print(f"   ✅ Uploaded MOE predictions")
    
    # Step 3: Sync Benchling data
    print("\n🧪 Syncing Benchling data...")
    response = requests.post(f"{BASE_URL}/api/sync/benchling?limit=50", timeout=30)
    if response.status_code == 200:
        print(f"   ✅ Synced Benchling assay results")
    
    # Step 4: Create drift checks for main model
    import time
    time.sleep(2)
    create_drift_checks("moe_kinase_101", count=3)
    
    print("\n" + "="*70)
    print("✅ DEMO DATA POPULATED!")
    print("="*70)
    print("\n📊 Created:")
    print(f"   ✅ {len(models)} models")
    print(f"   ✅ MOE predictions uploaded")
    print(f"   ✅ Benchling assay results synced")
    print(f"   ✅ Drift checks created")
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




