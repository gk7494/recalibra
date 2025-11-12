# Recalibra Python SDK

Python client library for interacting with the Recalibra API.

## Installation

```bash
pip install -e .
```

Or install from the main project directory:

```bash
cd sdk
pip install -e .
```

## Usage

```python
from recalibra_sdk import RecalibraClient

# Initialize client
client = RecalibraClient(base_url="http://localhost:8000")

# Check API health
health = client.health()
print(health)

# Create a molecule
molecule = client.create_molecule(
    name="Compound_001",
    compound_id="CMP-001",
    smiles="CCO",
    molecular_weight=46.07
)

# Create a model
model = client.create_model(
    name="MOE Docking Model",
    model_type="closed",
    source_system="MOE",
    version="2023.09"
)

# Sync data from Benchling
sync_result = client.sync_benchling(assay_id="assay_123")
print(f"Synced {sync_result['synced']} results")

# Sync predictions from MOE
moe_result = client.sync_moe(model_id=model.id)
print(f"Synced {moe_result['synced']} predictions")

# Check for drift
drift_check = client.check_drift(model_id=model.id)
if drift_check.drift_detected:
    print(f"Drift detected! R² = {drift_check.r_squared}")
    
    # Retrain the model
    retrain_result = client.retrain_model(model_id=model.id)
    print(f"Retrained model. New R² = {retrain_result['metrics']['r_squared']}")

# Get model metrics
metrics = client.get_model_metrics(model_id=model.id)
print(f"RMSE: {metrics['rmse']}, R²: {metrics['r_squared']}")

# Get audit logs
logs = client.get_audit_logs(entity_type="model", limit=10)
for log in logs:
    print(f"{log['action']} on {log['entity_type']} at {log['timestamp']}")

# Close client (or use context manager)
client.close()
```

## Context Manager

```python
with RecalibraClient(base_url="http://localhost:8000") as client:
    molecules = client.get_molecules()
    models = client.get_models()
    # Client automatically closes when exiting context
```

## API Reference

See the main Recalibra documentation for full API details.


