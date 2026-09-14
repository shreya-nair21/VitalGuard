from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List
from datetime import datetime

class UserBase(SQLModel):
    # Base user fields
    email: str
    username: str
    full_name: Optional[str] = None
    specialty: Optional[str] = Field(default="General Medicine")
    availability: Optional[str] = Field(default="available")

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    role: str = Field(default="doctor")  # Default role
    full_name: Optional[str] = None
    specialty: Optional[str] = Field(default="General Medicine")
    availability: str = Field(default="available")

class UserCreate(UserBase):
    hashed_password: str
    role: Optional[str] = "doctor"
    is_active: Optional[bool] = True
    full_name: Optional[str] = None
    specialty: Optional[str] = "General Medicine"
    availability: Optional[str] = "available"

class UserRead(UserBase):
    id: int
    role: str
    is_active: bool
    full_name: Optional[str] = None
    specialty: Optional[str] = "General Medicine"
    availability: Optional[str] = "available"

class PatientBase(SQLModel):
    name: str = Field(index=True)
    age: int
    gender: str = Field(default="M")
    mrn: Optional[str] = Field(default="N/A")  # Medical Record Number
    room_number: Optional[str] = Field(default=None, index=True)

class Patient(PatientBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    assessments: List["Assessment"] = Relationship(back_populates="patient")

class PatientCreate(SQLModel):
    name: str
    age: int
    gender: str = "M"
    mrn: Optional[str] = None
    room_number: Optional[str] = None

class PatientUpdate(SQLModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    mrn: Optional[str] = None
    room_number: Optional[str] = None

class PatientRead(PatientBase):
    id: int

class AssessmentBase(SQLModel):
    heart_rate: float
    systolic_bp: float
    respiratory_rate: float
    temperature: float
    spo2: float
    consciousness: str = Field(default="Alert")
    news_score: Optional[int] = None
    
    # Metadata
    notes: Optional[str] = None

class Assessment(AssessmentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: Optional[int] = Field(default=None, foreign_key="patient.id")
    
    # ML Results
    risk_level: str
    prediction_prob: float
    analysis_text: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    patient: Optional[Patient] = Relationship(back_populates="assessments")

class AssessmentCreate(AssessmentBase):
    patient_id: int

class AssessmentRead(AssessmentBase):
    id: int
    patient_id: Optional[int] = None
    risk_level: str
    prediction_prob: float
    analysis_text: Optional[str] = None
    timestamp: datetime

# --- Emergency Doctor Assignment Models ---
class DoctorAssignmentBase(SQLModel):
    patient_id: int = Field(foreign_key="patient.id")
    doctor_id: int = Field(foreign_key="user.id")
    assessment_id: Optional[int] = Field(default=None, foreign_key="assessment.id")
    room_number: Optional[str] = None
    status: str = Field(default="pending")  # "pending", "acknowledged", "resolved", "escalated_admin"
    attempted_doctor_ids: Optional[str] = Field(default="")
    escalation_level: int = Field(default=0)

class DoctorAssignment(DoctorAssignmentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None

class DoctorAssignmentRead(DoctorAssignmentBase):
    id: int
    created_at: datetime
    acknowledged_at: Optional[datetime] = None

class DoctorAssignmentDetail(DoctorAssignmentRead):
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    patient_mrn: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_full_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    seconds_remaining: Optional[int] = None
    vitals: Optional[dict] = None

# --- Medication & Prescription Models ---
class PrescriptionBase(SQLModel):
    patient_id: int = Field(foreign_key="patient.id")
    doctor_id: int = Field(foreign_key="user.id")
    assignment_id: Optional[int] = Field(default=None, foreign_key="doctorassignment.id")
    medication_name: str
    dosage: str
    route: str = Field(default="Oral (PO)")
    frequency: str = Field(default="TDS (3x/day)")
    duration: Optional[str] = Field(default="3 days")
    instructions: Optional[str] = None
    status: str = Field(default="ordered")
    administered_at: Optional[datetime] = None
    administered_by: Optional[str] = None
    administration_notes: Optional[str] = None

class Prescription(PrescriptionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PrescriptionCreate(SQLModel):
    patient_id: int
    assignment_id: Optional[int] = None
    medication_name: str
    dosage: str
    route: Optional[str] = "Oral (PO)"
    frequency: Optional[str] = "TDS (3x/day)"
    duration: Optional[str] = "3 days"
    instructions: Optional[str] = None

class PrescriptionRead(PrescriptionBase):
    id: int
    created_at: datetime
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    room_number: Optional[str] = None

