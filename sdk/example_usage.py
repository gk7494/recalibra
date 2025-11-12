"""
Example usage of the Recalibra Python SDK

This script demonstrates how to use the SDK to:
1. Create molecules and models
2. Sync data from Benchling and MOE
3. Check for drift
4. Retrain models
5. View audit logs
"""

from recalibra_sdk import RecalibraClient

def main():
    # Initialize client
    client = RecalibraClient(base_url="http://localhost:8000")
    
    try:
        # Check API health
        health = client.health()
        print(f"✅ API Status: {health['status']}")
        
        # Create a molecule
        print("\n📦 Creating molecule...")
        molecule = client.create_molecule(
            name="Compound_001",
            compound_id="CMP-001",
            smiles="CCO",
            molecular_weight=46.07
        )
        print(f"✅ Created molecule: {molecule.id}")
        
        # Create a model
        print("\n🤖 Creating model...")
        model = client.create_model(
            name="MOE Docking Model",
            model_type="closed",
            source_system="MOE",
            version="2023.09",
            description="MOE docking model - uses correction layer"
        )
        print(f"✅ Created model: {model.id}")
        
        # Sync data from Benchling
        print("\n🔄 Syncing from Benchling...")
        benchling_result = client.sync_benchling()
        print(f"✅ Synced {benchling_result['synced']} experimental results from {benchling_result['source']}")
        
        # Sync predictions from MOE
        print("\n🔄 Syncing from MOE...")
        moe_result = client.sync_moe(model_id=model.id)
        print(f"✅ Synced {moe_result['synced']} predictions from {moe_result['source']}")
        
        # Check for drift
        print("\n🔍 Checking for drift...")
        drift_check = client.check_drift(model_id=model.id)
        print(f"✅ Drift check completed:")
        print(f"   - Drift detected: {drift_check.drift_detected}")
        print(f"   - R²: {drift_check.r_squared:.3f}")
        print(f"   - RMSE: {drift_check.rmse:.3f}")
        print(f"   - KS Statistic: {drift_check.ks_statistic:.3f}")
        
        # If drift detected, retrain the model
        if drift_check.drift_detected:
            print("\n🔄 Retraining model...")
            retrain_result = client.retrain_model(model_id=model.id, model_type="ridge")
            print(f"✅ Model retrained:")
            print(f"   - New R²: {retrain_result['metrics']['r_squared']:.3f}")
            print(f"   - New RMSE: {retrain_result['metrics']['rmse']:.3f}")
            print(f"   - Training samples: {retrain_result['training_samples']}")
        
        # Get model metrics
        print("\n📊 Getting model metrics...")
        metrics = client.get_model_metrics(model_id=model.id)
        print(f"✅ Model metrics:")
        print(f"   - R²: {metrics['r_squared']:.3f}")
        print(f"   - RMSE: {metrics['rmse']:.3f}")
        print(f"   - MAE: {metrics['mae']:.3f}")
        print(f"   - Matched pairs: {metrics['matched_pairs']}")
        
        # Get audit logs
        print("\n📋 Getting audit logs...")
        logs = client.get_audit_logs(entity_type="model", limit=10)
        print(f"✅ Found {len(logs)} audit log entries:")
        for log in logs[:5]:  # Show first 5
            print(f"   - {log['action']} on {log['entity_type']} at {log['timestamp']}")
        
        # Get all models
        print("\n📋 Getting all models...")
        models = client.get_models()
        print(f"✅ Found {len(models)} models:")
        for m in models:
            print(f"   - {m.name} ({m.model_type}) - Last retrained: {m.last_retrained_at}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()


if __name__ == "__main__":
    main()


