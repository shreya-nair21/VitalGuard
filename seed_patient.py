import sys
import os
from sqlmodel import Session, select

# Add current directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.database import engine, create_db_and_tables
from backend.models import Patient

def seed_patient():
    create_db_and_tables()
    
    with Session(engine) as session:
        # Check if patient exists
        patient = session.get(Patient, 1)
        
        if patient:
            print(f"Patient ID: 1 already exists: {patient.name}")
            return

        print("Creating default patient (ID: 1)...")
        # Create a dummy patient
        new_patient = Patient(
            id=1,
            name="Sarah Jenkins",
            age=45,
            gender="F",
            mrn="VG-1001",
            room_number="101"
        )
        session.add(new_patient)
        session.commit()
        print("Successfully created patient: Sarah Jenkins (ID: 1)")

if __name__ == "__main__":
    seed_patient()
