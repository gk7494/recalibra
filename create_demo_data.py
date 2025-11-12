#!/usr/bin/env python3
"""Create demo data for Recalibra"""
import requests
import json
import random
import time

API_URL = "http://localhost:8000/api"

def create_demo_data():
    print("Creating demo data for Recalibra...")
    
    # Get or create models - need MOE (closed), Benchling (open), and other open models
    print("\n1. Setting up models...")
    models_resp = requests.get(f"{API_URL}/models")
    existing_models = models_resp.json() if models_resp.status_code == 200 else []
    
    # Create MOE model (closed - uses correction layer)
    moe_models = [m for m in existing_models if m.get("source_system") == "MOE"]
    if len(moe_models) > 0:
        moe_model = moe_models[0]
        moe_model_id = moe_model["id"]
        print(f"✅ Using existing MOE model: {moe_model['name']} (ID: {moe_model_id})")
    else:
        moe_model_data = {
            "name": "MOE Docking Model",
            "model_type": "closed",
            "source_system": "MOE",
            "version": "2023.09",
            "description": "MOE docking model - uses correction layer for retraining"
        }
        response = requests.post(f"{API_URL}/models", json=moe_model_data)
        if response.status_code == 200:
            moe_model = response.json()
            moe_model_id = moe_model["id"]
            print(f"✅ Created MOE model: {moe_model['name']} (ID: {moe_model_id})")
        else:
            print(f"❌ Failed to create MOE model: {response.text}")
            moe_model_id = None
    
    # Create Benchling model (open - trains directly)
    benchling_models = [m for m in existing_models if m.get("source_system") == "Benchling"]
    if len(benchling_models) > 0:
        benchling_model = benchling_models[0]
        benchling_model_id = benchling_model["id"]
        print(f"✅ Using existing Benchling model: {benchling_model['name']} (ID: {benchling_model_id})")
    else:
        benchling_model_data = {
            "name": "Benchling Activity Model",
            "model_type": "open",
            "source_system": "Benchling",
            "version": "1.0",
            "description": "Open model from Benchling - trains directly"
        }
        response = requests.post(f"{API_URL}/models", json=benchling_model_data)
        if response.status_code == 200:
            benchling_model = response.json()
            benchling_model_id = benchling_model["id"]
            print(f"✅ Created Benchling model: {benchling_model['name']} (ID: {benchling_model_id})")
        else:
            print(f"❌ Failed to create Benchling model: {response.text}")
            benchling_model_id = None
    
    # Create open model (Recalibra)
    open_models = [m for m in existing_models if m.get("source_system") == "Recalibra" and m.get("model_type") == "open"]
    if len(open_models) > 0:
        open_model = open_models[0]
        open_model_id = open_model["id"]
        print(f"✅ Using existing open model: {open_model['name']} (ID: {open_model_id})")
    else:
        open_model_data = {
            "name": "Ridge Regression Model",
            "model_type": "open",
            "source_system": "Recalibra",
            "version": "1.0",
            "description": "Open-source machine learning model - trains directly"
        }
        response = requests.post(f"{API_URL}/models", json=open_model_data)
        if response.status_code == 200:
            open_model = response.json()
            open_model_id = open_model["id"]
            print(f"✅ Created open model: {open_model['name']} (ID: {open_model_id})")
        else:
            print(f"❌ Failed to create open model: {response.text}")
            open_model_id = None
    
    # Use the open model as default for predictions
    model_id = open_model_id or benchling_model_id or moe_model_id
    if not model_id:
        print("❌ No models available")
        return
    
    # Get or create molecules
    print("\n2. Setting up molecules...")
    molecules_resp = requests.get(f"{API_URL}/molecules")
    if molecules_resp.status_code == 200 and len(molecules_resp.json()) > 0:
        molecules = molecules_resp.json()[:20]  # Use first 20
        print(f"✅ Using {len(molecules)} existing molecules")
    else:
        molecules = []
        for i in range(1, 21):
            mol_data = {
                "name": f"Compound_{i:03d}",
                "compound_id": f"CMP-{i:03d}",
                "smiles": f"CCO{i}",  # Mock SMILES
                "molecular_formula": f"C{10+i}H{15+i}N{i%5+1}O{i%3+1}",
                "molecular_weight": round(150.0 + i * 10.5, 2)
            }
            response = requests.post(f"{API_URL}/molecules", json=mol_data)
            if response.status_code == 200:
                mol = response.json()
                # Update ID if needed to match mol_1, mol_2, etc.
                if mol.get("id") != f"mol_{i}":
                    # Update via PUT if endpoint exists, or just use returned ID
                    pass
                molecules.append(mol)
        print(f"✅ Created {len(molecules)} molecules")
    
    if len(molecules) == 0:
        print("❌ No molecules available")
        return
    
    # Get or create assay
    print("\n3. Setting up assay...")
    assays_resp = requests.get(f"{API_URL}/assays")
    if assays_resp.status_code == 200 and len(assays_resp.json()) > 0:
        assay = assays_resp.json()[0]
        assay_id = assay["id"]
        print(f"✅ Using existing assay: {assay['name']}")
    else:
        assay_data = {
            "name": "IC50 Inhibition Assay",
            "assay_type": "IC50",
            "version": "v2.1",
            "cell_line": "HEK293",
            "target": "EGFR",
            "reagent_batch": "BATCH-2024-001",
            "instrument_id": "LC-MS-01",
            "operator": "Dr. Smith",
            "buffer_conditions": "PBS, pH 7.4, 37°C"
        }
        response = requests.post(f"{API_URL}/assays", json=assay_data)
        if response.status_code == 200:
            assay = response.json()
            assay_id = assay["id"]
            print(f"✅ Created assay: {assay['name']}")
        else:
            print(f"❌ Failed to create assay: {response.text}")
            return
    
    # Create predictions for all molecules with realistic values
    print("\n4. Creating predictions...")
    predictions = []
    existing_preds = requests.get(f"{API_URL}/predictions?model_id={model_id}")
    if existing_preds.status_code == 200 and len(existing_preds.json()) > 0:
        predictions = existing_preds.json()
        print(f"✅ Using {len(predictions)} existing predictions")
    else:
        # Create predictions with a base trend for better correlation
        base_values = [random.uniform(1.0, 8.0) for _ in molecules]
        for i, mol in enumerate(molecules):
            pred_data = {
                "model_id": model_id,
                "molecule_id": mol["id"],
                "predicted_value": round(base_values[i], 3),
                "value_type": "IC50",
                "units": "μM",
                "confidence_score": round(random.uniform(0.75, 0.95), 3)
            }
            response = requests.post(f"{API_URL}/predictions", json=pred_data)
            if response.status_code == 200:
                predictions.append(response.json())
            else:
                print(f"⚠️  Failed to create prediction for {mol['name']}: {response.text}")
        print(f"✅ Created {len(predictions)} predictions")
    
    # Create experimental results with better correlation for demo
    print("\n5. Creating experimental results...")
    results = []
    existing_results = requests.get(f"{API_URL}/experimental-results")
    if existing_results.status_code == 200 and len(existing_results.json()) > 0:
        results = existing_results.json()
        print(f"✅ Using {len(results)} existing results")
    else:
        pred_dict = {p["molecule_id"]: p for p in predictions}
        for i, mol in enumerate(molecules):
            # Create STRONG correlation for demo (R² > 0.7)
            # Simulate drift: later compounds have systematic shift
            drift_factor = 1.0 if i < 10 else 1.15  # Small drift after 10 compounds
            
            if mol["id"] in pred_dict:
                pred = pred_dict[mol["id"]]
                base_value = pred["predicted_value"]
                # High correlation: experimental = prediction * slope + intercept + small noise
                # This will give R² ~ 0.75-0.85
                slope = 0.92  # Slight systematic difference
                intercept = 0.3
                noise_scale = 0.15  # Small noise
                measured = (base_value * slope + intercept) * drift_factor + random.gauss(0, noise_scale)
            else:
                measured = random.uniform(0.5, 10.0)
            
            result_data = {
                "molecule_id": mol["id"],
                "assay_id": assay_id,
                "measured_value": round(max(0.1, measured), 3),  # Ensure positive
                "value_type": "IC50",
                "units": "μM",
                "uncertainty": round(random.uniform(0.1, 0.25), 3)
            }
            response = requests.post(f"{API_URL}/experimental-results", json=result_data)
            if response.status_code == 200:
                results.append(response.json())
            else:
                print(f"⚠️  Failed to create result for {mol['name']}: {response.text}")
        print(f"✅ Created {len(results)} experimental results")
    
    # Run drift detection
    print("\n6. Running drift detection...")
    time.sleep(1)  # Small delay
    response = requests.post(f"{API_URL}/drift/check/{model_id}")
    if response.status_code == 200:
        drift_check = response.json()
        print(f"✅ Drift check completed!")
        print(f"   Drift detected: {drift_check['drift_detected']}")
        if drift_check.get('r_squared'):
            print(f"   R² Score: {drift_check['r_squared']:.3f}")
        if drift_check.get('rmse'):
            print(f"   RMSE: {drift_check['rmse']:.3f}")
    else:
        print(f"⚠️  Drift check: {response.status_code} - {response.text}")
    
    print("\n" + "="*50)
    print("✅ Demo data ready!")
    print("="*50)
    print(f"\nModels created:")
    if moe_model_id:
        print(f"  • MOE (closed - uses correction layer)")
    if benchling_model_id:
        print(f"  • Benchling (open - trains directly)")
    if open_model_id:
        print(f"  • Recalibra (open - trains directly)")
    print(f"\nMolecules: {len(molecules)}")
    print(f"Predictions: {len(predictions)}")
    print(f"Experimental Results: {len(results)}")
    print("\n🌐 View in dashboard: http://localhost:3000")
    print("📚 API Docs: http://localhost:8000/docs")

if __name__ == "__main__":
    try:
        create_demo_data()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Backend not running!")
        print("Start it with: cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
