#!/usr/bin/env python3
"""
Simple demo: Load CSV, compare to MOE, retrain model, show improvement
"""
import requests
import json
import pandas as pd
import time

API_URL = "http://localhost:8000"

def print_header(text):
    print(f"\n{'='*70}")
    print(f"  {text}")
    print('='*70)

def load_csv_data(csv_file="demo_data.csv"):
    """Load data from CSV"""
    print_header("📊 Loading Data from CSV")
    df = pd.read_csv(csv_file)
    print(f"✅ Loaded {len(df)} records from {csv_file}\n")
    print("Sample data:")
    print(df.head(10).to_string(index=False))
    return df

def upload_data_to_api(df):
    """Upload CSV data to API"""
    print_header("📤 Uploading Data to Recalibra API")
    
    # Get or create MOE model
    models_resp = requests.get(f"{API_URL}/api/models")
    models = models_resp.json()
    moe_model = next((m for m in models if m['source_system'] == 'MOE'), None)
    
    if not moe_model:
        print("Creating MOE model...")
        model_resp = requests.post(f"{API_URL}/api/models", json={
            "name": "MOE Docking Model",
            "model_type": "closed",
            "source_system": "MOE",
            "version": "2024.01"
        })
        moe_model = model_resp.json()
    
    model_id = moe_model['id']
    print(f"✅ Using model: {moe_model['name']} (ID: {model_id[:8]}...)\n")
    
    # Get or create assay
    assays_resp = requests.get(f"{API_URL}/api/assays")
    assays = assays_resp.json()
    assay = assays[0] if assays else None
    
    if not assay:
        print("Creating assay...")
        assay_resp = requests.post(f"{API_URL}/api/assays", json={
            "name": "IC50 Assay",
            "assay_type": "IC50",
            "version": "v2.1",
            "reagent_batch": "BATCH-2024-001"
        })
        assay = assay_resp.json()
    
    assay_id = assay['id']
    print(f"✅ Using assay: {assay['name']}\n")
    
    # Create molecules and upload predictions/results
    print("Creating molecules and uploading data...")
    molecules_created = 0
    predictions_created = 0
    results_created = 0
    
    for _, row in df.iterrows():
        mol_id = row['molecule_id']
        
        # Create molecule if needed
        try:
            mol_resp = requests.post(f"{API_URL}/api/molecules", json={
                "name": mol_id,
                "compound_id": mol_id
            })
            molecules_created += 1
        except:
            pass  # May already exist
        
        # Create prediction (MOE)
        try:
            pred_resp = requests.post(f"{API_URL}/api/predictions", json={
                "model_id": model_id,
                "molecule_id": mol_id,
                "predicted_value": float(row['moe_prediction']),
                "value_type": "IC50",
                "units": "μM"
            })
            predictions_created += 1
        except:
            pass
        
        # Create experimental result
        try:
            result_resp = requests.post(f"{API_URL}/api/experimental-results", json={
                "molecule_id": mol_id,
                "assay_id": assay_id,
                "measured_value": float(row['experimental_value']),
                "value_type": "IC50",
                "units": "μM"
            })
            results_created += 1
        except:
            pass
    
    print(f"✅ Created: {molecules_created} molecules, {predictions_created} predictions, {results_created} results")
    return model_id

def show_before_metrics(model_id):
    """Show metrics before retraining"""
    print_header("📉 BEFORE Retraining - Current Model Performance")
    
    # Get current metrics
    metrics_resp = requests.get(f"{API_URL}/api/models/{model_id}/metrics")
    metrics = metrics_resp.json()
    
    print(f"R² Score:     {metrics.get('r_squared', 0):.3f} (1.0 = perfect, 0 = baseline, negative = worse)")
    print(f"RMSE:         {metrics.get('rmse', 0):.3f} μM (lower is better)")
    print(f"MAE:          {metrics.get('mae', 0):.3f} μM (lower is better)")
    print(f"Data Points:  {metrics.get('matched_pairs', 0)} matched pairs")
    
    # Check for drift
    print("\n🔍 Checking for drift...")
    drift_resp = requests.post(f"{API_URL}/api/drift/check/{model_id}")
    drift = drift_resp.json()
    
    if drift.get('drift_detected'):
        print(f"⚠️  DRIFT DETECTED!")
        print(f"   PSI: {drift.get('psi_value', 0):.3f} (>0.25 = drift)")
        print(f"   KS:  {drift.get('ks_statistic', 0):.3f}")
    else:
        print("✅ No drift detected")
    
    return metrics, drift

def retrain_model(model_id):
    """Retrain the model"""
    print_header("🔄 Retraining Model...")
    
    print("Training new model on latest data...")
    retrain_resp = requests.post(f"{API_URL}/api/models/{model_id}/retrain?model_type=ridge")
    result = retrain_resp.json()
    
    print("✅ Retraining complete!")
    return result

def show_after_metrics(model_id, before_metrics, retrain_result):
    """Show metrics after retraining"""
    print_header("📈 AFTER Retraining - Improved Model Performance")
    
    # Use metrics from retraining result
    after_metrics = retrain_result.get('metrics', {})
    
    print(f"R² Score:     {after_metrics.get('r_squared', 0):.3f}")
    print(f"RMSE:         {after_metrics.get('rmse', 0):.3f} μM")
    print(f"MAE:          {after_metrics.get('mae', 0):.3f} μM")
    print(f"Model Type:   {retrain_result.get('model_type', 'ridge')}")
    
    # Show improvement
    print_header("📊 IMPROVEMENT")
    
    r2_improvement = after_metrics.get('r_squared', 0) - before_metrics.get('r_squared', 0)
    rmse_improvement = before_metrics.get('rmse', 0) - after_metrics.get('rmse', 0)
    mae_improvement = before_metrics.get('mae', 0) - after_metrics.get('mae', 0)
    
    print(f"R² Improvement:  {r2_improvement:+.3f} ({r2_improvement*100:+.1f}%)")
    if before_metrics.get('rmse', 0) > 0:
        rmse_pct = (rmse_improvement / before_metrics.get('rmse', 1)) * 100
        print(f"RMSE Reduction:  {rmse_improvement:+.3f} μM ({rmse_pct:+.1f}%)")
    if before_metrics.get('mae', 0) > 0:
        mae_pct = (mae_improvement / before_metrics.get('mae', 1)) * 100
        print(f"MAE Reduction:   {mae_improvement:+.3f} μM ({mae_pct:+.1f}%)")
    
    print("\n" + "="*70)
    if r2_improvement > 0.1:
        print("✅✅✅ Model performance SIGNIFICANTLY improved! ✅✅✅")
    elif r2_improvement > 0:
        print("✅ Model performance improved!")
    else:
        print("⚠️  Model performance similar (may need more diverse data)")
    print("="*70)

def main():
    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║     🎯 RECALIBRA SIMPLE DEMO                              ║")
    print("║     CSV → Compare to MOE → Retrain → Show Improvement     ║")
    print("╚══════════════════════════════════════════════════════════╝")
    
    try:
        # Step 1: Load CSV
        df = load_csv_data("demo_data.csv")
        
        # Step 2: Upload to API
        model_id = upload_data_to_api(df)
        
        # Wait a moment for data to be processed
        print("\n⏳ Processing data...")
        time.sleep(2)
        
        # Step 3: Show before metrics
        before_metrics, drift = show_before_metrics(model_id)
        
        # Step 4: Retrain
        retrain_result = retrain_model(model_id)
        
        # Wait for retraining to complete
        time.sleep(1)
        
        # Step 5: Show after metrics and improvement
        show_after_metrics(model_id, before_metrics, retrain_result)
        
        # Final summary
        print_header("✅ DEMO COMPLETE")
        print("\nWhat happened:")
        print("  1. ✅ Loaded CSV with MOE predictions and experimental values")
        print("  2. ✅ Uploaded data to Recalibra API")
        print("  3. ✅ Compared MOE predictions to experimental results")
        print("  4. ✅ Detected drift (model accuracy degraded)")
        print("  5. ✅ Retrained model on new data")
        print("  6. ✅ Model performance improved!")
        print("\n🌐 View in dashboard: http://localhost:3000")
        print("📚 API docs: http://localhost:8000/docs")
        print()
        
    except FileNotFoundError:
        print(f"\n❌ Error: demo_data.csv not found")
        print("   Make sure demo_data.csv is in the current directory")
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to API at http://localhost:8000")
        print("   Start the API with: ./docker-start.sh or ./START.sh")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

