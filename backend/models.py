from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List
from datetime import datetime

class UserBase(SQLModel):
    # Base user fields
    email: str
    username: str

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    role: str = Field(default="doctor")  # Default role

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
    risk_level: str
    prediction_prob: float
    analysis_text: str
    timestamp: datetime
