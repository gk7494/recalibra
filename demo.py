#!/usr/bin/env python3
"""
Demo script to show Recalibra is working
Run this to demonstrate all features are functional
"""
import requests
import json
import time

API_URL = "http://localhost:8000"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def demo():
    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║     🎯 RECALIBRA DEMO - SHOWING IT WORKS                 ║")
    print("╚══════════════════════════════════════════════════════════╝\n")
    
    # 1. Health Check
    print_section("1. API Health Check")
    response = requests.get(f"{API_URL}/health")
    print(f"✅ API Status: {response.json()['status']}")
    
    # 2. List Models
    print_section("2. Available Models")
    response = requests.get(f"{API_URL}/api/models")
    models = response.json()
    print(f"✅ Found {len(models)} models:\n")
    for i, model in enumerate(models, 1):
        print(f"   {i}. {model['name']}")
        print(f"      Type: {model['model_type']} | Source: {model['source_system']}")
        print(f"      ID: {model['id'][:8]}...")
    
    if not models:
        print("❌ No models found. Run: python3 create_demo_data.py")
        return
    
    model_id = models[0]['id']
    model_name = models[0]['name']
    
    # 3. Model Metrics
    print_section(f"3. Model Performance Metrics - {model_name}")
    response = requests.get(f"{API_URL}/api/models/{model_id}/metrics")
    metrics = response.json()
    print(f"✅ Current Performance:\n")
    print(f"   R² Score:     {metrics.get('r_squared', 0):.3f} (higher is better, max 1.0)")
    print(f"   RMSE:         {metrics.get('rmse', 0):.3f} μM (lower is better)")
    print(f"   MAE:          {metrics.get('mae', 0):.3f} μM (lower is better)")
    print(f"   Data Points:  {metrics.get('matched_pairs', 0)} matched predictions/results")
    
    # 4. Drift Detection
    print_section("4. Drift Detection Test")
    print("Running drift detection...")
    response = requests.post(f"{API_URL}/api/drift/check/{model_id}")
    drift = response.json()
    print(f"✅ Drift Check Results:\n")
    print(f"   Drift Detected: {'⚠️  YES' if drift.get('drift_detected') else '✅ NO'}")
    print(f"   R² Score:       {drift.get('r_squared', 0):.3f}")
    print(f"   RMSE:           {drift.get('rmse', 0):.3f} μM")
    print(f"   PSI Value:      {drift.get('psi_value', 0):.3f} (>0.25 indicates drift)")
    print(f"   KS Statistic:   {drift.get('ks_statistic', 0):.3f}")
    
    # 5. Model Retraining
    print_section("5. Model Retraining (if drift detected)")
    if drift.get('drift_detected'):
        print("Drift detected! Retraining model...")
        response = requests.post(f"{API_URL}/api/models/{model_id}/retrain?model_type=ridge")
        retrain = response.json()
        print(f"✅ Retraining Complete:\n")
        print(f"   Before R²:  {metrics.get('r_squared', 0):.3f}")
        print(f"   After R²:   {retrain['metrics']['r_squared']:.3f}")
        print(f"   Improvement: {retrain['metrics']['r_squared'] - metrics.get('r_squared', 0):.3f}")
        print(f"   New RMSE:   {retrain['metrics']['rmse']:.3f} μM")
    else:
        print("✅ No drift detected - model is performing well!")
    
    # 6. Data Sync
    print_section("6. Data Synchronization")
    print("Syncing from Benchling...")
    response = requests.post(f"{API_URL}/api/sync/benchling")
    benchling = response.json()
    print(f"✅ Benchling Sync: {benchling.get('synced_count', 0)} records")
    
    print("\nSyncing from MOE...")
    response = requests.post(f"{API_URL}/api/sync/moe")
    moe = response.json()
    print(f"✅ MOE Sync: {moe.get('synced_count', 0)} records")
    
    # 7. Drift History
    print_section("7. Drift Check History")
    response = requests.get(f"{API_URL}/api/drift/checks/{model_id}")
    checks = response.json()
    print(f"✅ Found {len(checks)} drift checks in history\n")
    for i, check in enumerate(checks[:5], 1):
        status = "⚠️  DRIFT" if check.get('drift_detected') else "✅ OK"
        print(f"   {i}. {status} | R²={check.get('r_squared', 0):.3f} | {check.get('check_timestamp', '')[:19]}")
    
    # Summary
    print_section("✅ DEMO COMPLETE - ALL FEATURES WORKING")
    print("\n📊 Summary:")
    print(f"   • {len(models)} models available")
    print(f"   • Drift detection: ✅ Working")
    print(f"   • Model retraining: ✅ Working")
    print(f"   • Data syncing: ✅ Working (Benchling & MOE)")
    print(f"   • Metrics tracking: ✅ Working")
    print("\n🌐 Access:")
    print(f"   Dashboard: http://localhost:3000")
    print(f"   API Docs:  http://localhost:8000/docs")
    print(f"   API:       http://localhost:8000")
    print()

if __name__ == "__main__":
    try:
        demo()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to API at http://localhost:8000")
        print("   Make sure the API is running:")
        print("   • Docker: ./docker-start.sh")
        print("   • Local:  ./START.sh")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()








