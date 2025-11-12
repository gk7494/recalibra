#!/usr/bin/env python3
"""
Script to import CSV data into Recalibra

Usage:
    python import_csv.py molecules.csv
    python import_csv.py experimental_results.csv
    python import_csv.py predictions.csv
"""

import sys
import csv
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import Molecule, Assay, Prediction, ExperimentalResult, Model
from datetime import datetime

def import_molecules(csv_file: str, db: Session):
    """Import molecules from CSV (wet lab format)"""
    print(f"Importing molecules from {csv_file}...")
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            # Map wet lab column names to our schema
            compound_id = row.get('Compound_ID') or row.get('compound_id') or row.get('id')
            name = row.get('Name') or row.get('name')
            smiles = row.get('SMILES') or row.get('smiles')
            mol_formula = row.get('Molecular_Formula') or row.get('molecular_formula')
            mw = row.get('MW_Da') or row.get('molecular_weight') or row.get('MW')
            cas = row.get('CAS_Number') or row.get('cas_number')
            
            # Generate ID from compound_id
            mol_id = f"mol_{compound_id.replace('CMP-', '').zfill(3)}" if compound_id else f"mol_{count+1:03d}"
            
            # Check if molecule already exists
            existing = db.query(Molecule).filter(
                (Molecule.id == mol_id) | (Molecule.compound_id == compound_id)
            ).first()
            if existing:
                print(f"  ⚠️  Molecule {compound_id} already exists, skipping...")
                continue
            
            molecule = Molecule(
                id=mol_id,
                name=name or compound_id,
                compound_id=compound_id,
                smiles=smiles,
                molecular_formula=mol_formula,
                molecular_weight=float(mw) if mw else None,
                cas_number=cas,
                metadata_json={
                    'supplier': row.get('Supplier'),
                    'source': 'csv_import'
                }
            )
            db.add(molecule)
            count += 1
        
        db.commit()
        print(f"  ✅ Imported {count} molecules")


def import_experimental_results(csv_file: str, db: Session):
    """Import experimental results from CSV (wet lab format)"""
    print(f"Importing experimental results from {csv_file}...")
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        count = 0
        assays_created = {}
        
        for row in reader:
            # Map wet lab column names
            compound_id = row.get('Compound_ID') or row.get('compound_id')
            plate_id = row.get('Plate_ID') or row.get('plate_id')
            well = row.get('Well') or row.get('well')
            assay_date = row.get('Assay_Date') or row.get('assay_date') or row.get('run_date')
            operator = row.get('Operator') or row.get('operator')
            ic50 = row.get('IC50_uM') or row.get('measured_value') or row.get('IC50')
            std_error = row.get('Std_Error_uM') or row.get('uncertainty') or row.get('std_error')
            reagent_batch = row.get('Reagent_Batch') or row.get('reagent_batch')
            instrument = row.get('Instrument') or row.get('instrument_id')
            cell_line = row.get('Cell_Line') or row.get('cell_line')
            target = row.get('Target') or row.get('target')
            notes = row.get('Notes') or row.get('notes')
            
            # Find molecule by compound_id
            molecule = db.query(Molecule).filter(Molecule.compound_id == compound_id).first()
            if not molecule:
                print(f"  ⚠️  Molecule {compound_id} not found, skipping result...")
                continue
            
            # Create or get assay based on reagent batch and date
            assay_key = f"{reagent_batch}_{assay_date}"
            if assay_key not in assays_created:
                assay_id = f"assay_{reagent_batch.replace('BATCH-', '').replace('-', '_')}"
                assay = db.query(Assay).filter(Assay.id == assay_id).first()
                if not assay:
                    assay = Assay(
                        id=assay_id,
                        name="IC50 Inhibition Assay",
                        assay_type="IC50",
                        version=f"v{assay_date.replace('-', '.')}",
                        cell_line=cell_line or "HEK293",
                        target=target or "EGFR",
                        reagent_batch=reagent_batch,
                        instrument_id=instrument,
                        operator=operator,
                        buffer_conditions="PBS, pH 7.4, 37°C"
                    )
                    db.add(assay)
                    db.commit()
                assays_created[assay_key] = assay_id
            else:
                assay_id = assays_created[assay_key]
            
            # Check if result already exists
            existing = db.query(ExperimentalResult).filter(
                ExperimentalResult.molecule_id == molecule.id,
                ExperimentalResult.assay_id == assay_id
            ).first()
            if existing:
                print(f"  ⚠️  Result for {compound_id} in {assay_id} already exists, skipping...")
                continue
            
            result = ExperimentalResult(
                molecule_id=molecule.id,
                assay_id=assay_id,
                measured_value=float(ic50),
                value_type="IC50",
                units="μM",
                uncertainty=float(std_error) if std_error else None,
                metadata_json={
                    'plate_id': plate_id,
                    'well': well,
                    'assay_date': assay_date,
                    'notes': notes,
                    'source': 'csv_import'
                }
            )
            db.add(result)
            count += 1
        
        db.commit()
        print(f"  ✅ Imported {count} experimental results")


def import_predictions(csv_file: str, db: Session):
    """Import predictions from CSV (wet lab format)"""
    print(f"Importing predictions from {csv_file}...")
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        count = 0
        models_created = {}
        
        for row in reader:
            # Map wet lab column names
            compound_id = row.get('Compound_ID') or row.get('compound_id')
            model_name = row.get('Model_Name') or row.get('model_name') or 'MOE_Docking_Model'
            model_version = row.get('Model_Version') or row.get('model_version') or '2023.09'
            pred_ic50 = row.get('Predicted_IC50_uM') or row.get('predicted_value') or row.get('IC50')
            confidence = row.get('Confidence_Score') or row.get('confidence_score')
            docking_score = row.get('Docking_Score') or row.get('docking_score')
            method = row.get('Method') or row.get('method')
            force_field = row.get('Force_Field') or row.get('force_field')
            date_gen = row.get('Date_Generated') or row.get('date_generated')
            
            # Find molecule by compound_id
            molecule = db.query(Molecule).filter(Molecule.compound_id == compound_id).first()
            if not molecule:
                print(f"  ⚠️  Molecule {compound_id} not found, skipping prediction...")
                continue
            
            # Create or get model
            model_key = f"{model_name}_{model_version}"
            if model_key not in models_created:
                model_id = f"model_{model_name.lower().replace(' ', '_')}_{model_version.replace('.', '_')}"
                model = db.query(Model).filter(Model.id == model_id).first()
                if not model:
                    model = Model(
                        id=model_id,
                        name=model_name.replace('_', ' '),
                        model_type="closed",
                        source_system="MOE",
                        version=model_version,
                        description=f"MOE docking model - {method or 'GBVI/WSA'}"
                    )
                    db.add(model)
                    db.commit()
                models_created[model_key] = model_id
            else:
                model_id = models_created[model_key]
            
            # Check if prediction already exists
            existing = db.query(Prediction).filter(
                Prediction.model_id == model_id,
                Prediction.molecule_id == molecule.id
            ).first()
            if existing:
                print(f"  ⚠️  Prediction for {compound_id} already exists, skipping...")
                continue
            
            prediction = Prediction(
                model_id=model_id,
                molecule_id=molecule.id,
                predicted_value=float(pred_ic50),
                value_type="IC50",
                units="μM",
                confidence_score=float(confidence) if confidence else None,
                metadata_json={
                    'docking_score': float(docking_score) if docking_score else None,
                    'method': method,
                    'force_field': force_field,
                    'date_generated': date_gen,
                    'source': 'csv_import'
                }
            )
            db.add(prediction)
            count += 1
        
        db.commit()
        print(f"  ✅ Imported {count} predictions")


def main():
    if len(sys.argv) < 2:
        print("Usage: python import_csv.py <csv_file>")
        print("\nAvailable CSV files:")
        print("  - molecules.csv")
        print("  - experimental_results.csv")
        print("  - predictions.csv")
        print("\nOr import all:")
        print("  python import_csv.py all")
        sys.exit(1)
    
    # Initialize database
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        csv_file = sys.argv[1]
        
        if csv_file == "all":
            # Import all CSV files
            base_dir = Path(__file__).parent
            import_molecules(str(base_dir / "molecules.csv"), db)
            import_experimental_results(str(base_dir / "experimental_results.csv"), db)
            import_predictions(str(base_dir / "predictions.csv"), db)
        else:
            # Import specific file
            if not os.path.exists(csv_file):
                print(f"❌ Error: File {csv_file} not found")
                sys.exit(1)
            
            if "molecules" in csv_file.lower():
                import_molecules(csv_file, db)
            elif "experimental" in csv_file.lower() or "results" in csv_file.lower():
                import_experimental_results(csv_file, db)
            elif "prediction" in csv_file.lower():
                import_predictions(csv_file, db)
            else:
                print(f"❌ Error: Unknown file type. Please specify molecules, experimental_results, or predictions CSV")
                sys.exit(1)
        
        print("\n✅ Import complete!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

