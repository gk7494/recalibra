#!/usr/bin/env python3
"""Delete models with no data to make demo look real"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import SessionLocal
from app.db.models import Model, ModelPrediction, AssayResult
from sqlalchemy import func

def cleanup():
    db = SessionLocal()
    try:
        models = db.query(Model).all()
        deleted = 0
        
        for model in models:
            # Count predictions for this model
            pred_count = db.query(func.count(ModelPrediction.id)).filter(
                ModelPrediction.model_id == model.id
            ).scalar()
            
            if pred_count == 0:
                print(f"Deleting model '{model.name}' (no predictions)")
                db.delete(model)
                deleted += 1
        
        db.commit()
        print(f"\n✅ Deleted {deleted} empty models")
        
        # Show remaining models
        remaining = db.query(Model).all()
        print(f"\n📊 Remaining models: {len(remaining)}")
        for m in remaining:
            pred_count = db.query(func.count(ModelPrediction.id)).filter(
                ModelPrediction.model_id == m.id
            ).scalar()
            print(f"   - {m.name}: {pred_count} predictions")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()




