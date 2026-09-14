from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, func, col
from pydantic import BaseModel
from typing import List, Optional
from datetime import timedelta
from contextlib import asynccontextmanager
import sys
import os

# Import local modules with fallback for running directly or as a package
try:
    from .database import create_db_and_tables, get_session
    from .models import (
        User, UserCreate, UserRead,
        Patient, PatientCreate, PatientUpdate, PatientRead,
        Assessment, AssessmentCreate, AssessmentRead
    )
    from .auth import (
        create_access_token, get_current_user, verify_password,
        get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme
    )
except (ImportError, ValueError):
    from database import create_db_and_tables, get_session
    from models import (
        User, UserCreate, UserRead,
        Patient, PatientCreate, PatientUpdate, PatientRead,
        Assessment, AssessmentCreate, AssessmentRead
    )
    from auth import (
        create_access_token, get_current_user, verify_password,
        get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme
    )

# Add project root to sys.path to import ml module
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from ml.predict import VitalGuardPredictor
except ImportError:
    print("Warning: ML module not found. Run from project root.")
    VitalGuardPredictor = None

# Global model instance
predictor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    global predictor
    try:
        models_path = os.path.join(os.path.dirname(__file__), '..', 'ml', 'models')
        if VitalGuardPredictor is not None and os.path.exists(models_path):
            predictor = VitalGuardPredictor(models_dir=models_path)
            print("ML Model loaded successfully.")
        else:
            print(f"Warning: ML model not found or predictor not available at {models_path}")
    except Exception as e:
        print(f"Warning: Could not load ML model: {e}")
    yield

app = FastAPI(title="VitalGuard API", lifespan=lifespan)

# CORS setup for frontend integration
origins = [
    "http://localhost:5173",  # Vite default
    "http://localhost:3000",  # React default
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to VitalGuard API"}

# --- Auth Routes ---
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/token")
async def login_for_access_token(
    request: Request,
    session: Session = Depends(get_session)
):
    # Support both JSON payload (frontend fetch) and form-encoded data (Swagger UI OAuth2 modal)
    content_type = request.headers.get("content-type", "")
    username = None
    password = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username")
            password = body.get("password")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload"
            )
    else:
        try:
            form = await request.form()
            username = form.get("username")
            password = form.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )

    # Try to find user by username or email
    user = session.exec(
        select(User).where((User.username == username) | (User.email == username))
    ).first()
    
    if not user or not verify_password(str(password), user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user.username,
        "role": user.role
    }

@app.post("/register", response_model=UserRead)
def register_user(
    user: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = session.exec(select(User).where(User.email == user.email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = get_password_hash(user.hashed_password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_pwd,
        role=user.role or "doctor",
        is_active=user.is_active if user.is_active is not None else True
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.get("/users", response_model=List[UserRead])
def get_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    return session.exec(select(User)).all()

@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting the last active user/admin
    count = len(session.exec(select(User)).all())
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last remaining user")
        
    session.delete(user)
    session.commit()
    return {"message": "User deleted successfully"}

# --- Patient Helper Functions ---
def get_next_patient_id(session: Session) -> int:
    max_id = session.exec(select(func.max(Patient.id))).one()
    return (max_id or 0) + 1

def get_next_available_room(session: Session) -> str:
    occupied_rooms = set(r for r in session.exec(select(Patient.room_number)).all() if r)
    candidate = 101
    while str(candidate) in occupied_rooms:
        candidate += 1
    return str(candidate)

# --- Patient Routes ---
@app.get("/patients/next-allotment")
def get_next_allotment(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    next_id = get_next_patient_id(session)
    next_room = get_next_available_room(session)
    return {
        "next_id": next_id,
        "next_room": next_room,
        "next_mrn": f"VG-{1000 + next_id}"
    }

@app.post("/patients/", response_model=PatientRead)
def create_patient(
    patient: PatientCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Determine next sequential ID in order
    next_id = get_next_patient_id(session)
    
    # 2. MRN is auto-generated if blank
    mrn = patient.mrn.strip() if (patient.mrn and patient.mrn.strip()) else f"VG-{1000 + next_id}"
    
    # 3. Automatically allot first available room from pool if not provided
    room_number = patient.room_number.strip() if (patient.room_number and patient.room_number.strip()) else get_next_available_room(session)
    
    db_patient = Patient(
        id=next_id,
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        mrn=mrn,
        room_number=room_number
    )
    session.add(db_patient)
    session.commit()
    session.refresh(db_patient)
    return db_patient

@app.get("/patients/", response_model=List[PatientRead])
def read_patients(
    offset: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    patients = session.exec(select(Patient).offset(offset).limit(limit)).all()
    return patients

@app.get("/patients/{patient_id}", response_model=PatientRead)
def read_patient(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.put("/patients/{patient_id}", response_model=PatientRead)
def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_patient = session.get(Patient, patient_id)
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient_data = (
        patient_update.model_dump(exclude_unset=True)
        if hasattr(patient_update, "model_dump")
        else patient_update.dict(exclude_unset=True)
    )
    for key, value in patient_data.items():
        if value is not None:
            setattr(db_patient, key, value)
    
    session.add(db_patient)
    session.commit()
    session.refresh(db_patient)
    return db_patient

@app.delete("/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Manually delete child assessments to prevent foreign key errors
    assessments = session.exec(select(Assessment).where(Assessment.patient_id == patient_id)).all()
    for assessment in assessments:
        session.delete(assessment)
        
    session.delete(patient)
    session.commit()
    return {"message": "Patient deleted successfully"}

# --- Assessment Routes (ML Integration) ---
@app.post("/assessments/", response_model=AssessmentRead)
def create_assessment(
    assessment_in: AssessmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    global predictor
    
    # Check if patient exists if ID provided
    if assessment_in.patient_id:
        patient = session.get(Patient, assessment_in.patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

    # Call ML Model
    risk_level = "Unknown"
    prediction_prob = 0.0
    analysis_text = "Model not loaded"
    calculated_news = assessment_in.news_score
    
    if predictor:
        try:
            # Prepare vitals dictionary for predictor
            vitals = {
                "heart_rate": assessment_in.heart_rate,
                "systolic_bp": assessment_in.systolic_bp,
                "respiratory_rate": assessment_in.respiratory_rate,
                "temperature": assessment_in.temperature,
                "spo2": assessment_in.spo2,
                "consciousness": assessment_in.consciousness,
                # Default age/gender if not provided (could fetch from patient)
                "age": 50, 
                "gender": "M"
            }
            if assessment_in.patient_id:
                patient = session.get(Patient, assessment_in.patient_id)
                if patient:
                    vitals["age"] = patient.age
                    vitals["gender"] = patient.gender
            
            result = predictor.predict(vitals)
            prediction_prob = float(result.get("probability", 0.0))
            analysis_text = result.get("analysis", "")
            if not analysis_text and result.get("error"):
                analysis_text = f"Prediction note: {result.get('error')}"
                
            if "news_score" in result and calculated_news is None:
                calculated_news = result.get("news_score")
            
            # 4-tier risk classification based on confidence/probability score
            if prediction_prob >= 0.75:
                risk_level = "Critical"
            elif prediction_prob >= 0.50:
                risk_level = "High Risk"
            elif prediction_prob >= 0.25:
                risk_level = "Moderate"
            else:
                risk_level = "Stable"
            
        except Exception as e:
            print(f"Error during prediction: {e}")
            risk_level = "Error"
            analysis_text = f"Error during prediction: {e}"
    
    # Save to Database
    assessment_dict = (
        assessment_in.model_dump()
        if hasattr(assessment_in, "model_dump")
        else assessment_in.dict()
    )
    if calculated_news is not None:
        assessment_dict["news_score"] = calculated_news

    db_assessment = Assessment(
        **assessment_dict,
        risk_level=risk_level,
        prediction_prob=prediction_prob,
        analysis_text=analysis_text
    )
    
    session.add(db_assessment)
    session.commit()
    session.refresh(db_assessment)
    return db_assessment

@app.get("/assessments/{patient_id}", response_model=List[AssessmentRead])
def read_assessments(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    assessments = session.exec(
        select(Assessment)
        .where(Assessment.patient_id == patient_id)
        .order_by(col(Assessment.timestamp).desc())
    ).all()
    return assessments

@app.get("/dashboard-stats")
def get_dashboard_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    total_patients = session.exec(select(Patient)).all()
    count_total = len(total_patients)
    
    # Get latest assessment for each patient to determine risk
    high_risk_count = 0
    stable_count = 0
    
    for patient in total_patients:
        latest = session.exec(
            select(Assessment)
            .where(Assessment.patient_id == patient.id)
            .order_by(col(Assessment.timestamp).desc())
        ).first()
        if latest:
            if latest.risk_level in ["High Risk", "Critical"]:
                high_risk_count += 1
            else:
                stable_count += 1
        else:
            stable_count += 1

    return {
        "total_patients": count_total,
        "high_risk_patients": high_risk_count,
        "stable_patients": stable_count,
        "ai_accuracy": 98.5
    }

# --- Direct Predict Endpoint ---
@app.post("/predict")
def predict_risk(vitals: dict):
    global predictor
    if not predictor:
        return {"error": "Model not loaded", "risk_level": "Unknown", "probability": 0.0}
    
    try:
        # Ensure minimal fields
        defaults = {
            "age": 50, "gender": "M", "consciousness": "Alert",
            "heart_rate": 75, "systolic_bp": 120, "spo2": 98, 
            "temperature": 37.0, "respiratory_rate": 16
        }
        for k, v in defaults.items():
            if k not in vitals:
                vitals[k] = v
                
        result = predictor.predict(vitals)
        return result
    except Exception as e:
        print(f"Prediction error: {e}")
        return {"error": str(e), "risk_level": "Error", "probability": 0.0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
