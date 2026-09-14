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
        Assessment, AssessmentCreate, AssessmentRead,
        DoctorAssignment, DoctorAssignmentRead, DoctorAssignmentDetail,
        Prescription, PrescriptionCreate, PrescriptionRead
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
        Assessment, AssessmentCreate, AssessmentRead,
        DoctorAssignment, DoctorAssignmentRead, DoctorAssignmentDetail,
        Prescription, PrescriptionCreate, PrescriptionRead
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

def format_doctor_display_name(doc: Optional[User]) -> str:
    if not doc:
        return "Staff Clinician"
    if getattr(doc, "full_name", None):
        return doc.full_name
    raw = doc.username
    if raw.lower().startswith("dr."):
        return f"Dr. {raw[3:].title()}"
    return f"Dr. {raw.title()}"

def select_best_available_doctor(session: Session, exclude_doctor_ids: Optional[List[int]] = None) -> Optional[User]:
    if exclude_doctor_ids is None:
        exclude_doctor_ids = []

    # 1. Query doctors with availability == 'available'
    available_doctors = [
        u for u in session.exec(select(User).where(User.role == "doctor", User.availability == "available")).all()
        if u.id not in exclude_doctor_ids
    ]

    # 2. Fallback to any doctor who is not off-duty if none strictly marked 'available'
    if not available_doctors:
        available_doctors = [
            u for u in session.exec(select(User).where(User.role == "doctor", User.availability != "off_duty")).all()
            if u.id not in exclude_doctor_ids
        ]

    if not available_doctors:
        return None

    # 3. Calculate active critical caseload for each doctor (pending or acknowledged)
    doctor_workloads = []
    for doc in available_doctors:
        active_assignments = session.exec(
            select(DoctorAssignment)
            .where(DoctorAssignment.doctor_id == doc.id)
            .where(DoctorAssignment.status.in_(["pending", "acknowledged"]))
        ).all()
        doctor_workloads.append((len(active_assignments), doc.id, doc))

    # Sort by active count ASC, then doctor_id ASC (fair-share load balancing)
    doctor_workloads.sort(key=lambda item: (item[0], item[1]))
    return doctor_workloads[0][2]

def check_and_escalate_assignments(session: Session):
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    timeout_threshold = now - timedelta(seconds=60)

    # Check all pending assignments created > 60 seconds ago
    timed_out_assignments = session.exec(
        select(DoctorAssignment)
        .where(DoctorAssignment.status == "pending")
        .where(DoctorAssignment.created_at <= timeout_threshold)
    ).all()

    for assign in timed_out_assignments:
        attempted = [int(x.strip()) for x in (assign.attempted_doctor_ids or "").split(",") if x.strip().isdigit()]
        if assign.doctor_id not in attempted:
            attempted.append(assign.doctor_id)

        next_doctor = select_best_available_doctor(session, exclude_doctor_ids=attempted)
        if next_doctor:
            assign.doctor_id = next_doctor.id
            assign.created_at = datetime.utcnow()  # Reset 60s countdown for new doctor
            assign.attempted_doctor_ids = ",".join(str(x) for x in attempted + [next_doctor.id])
            assign.escalation_level = (assign.escalation_level or 0) + 1
            session.add(assign)
            session.commit()
            print(f"[60s Timeout Escalation] Re-assigned Patient {assign.patient_id} (Room {assign.room_number}) to Dr. {next_doctor.username}")
        else:
            # All available doctors exhausted! Escalate to Chief Medical Officer / Admin
            admin_user = session.exec(select(User).where(User.role == "admin")).first()
            if admin_user:
                assign.doctor_id = admin_user.id
                assign.status = "escalated_admin"
                assign.escalation_level = (assign.escalation_level or 0) + 1
                session.add(assign)
                session.commit()
                print(f"[Admin Escalation] All doctors unresponsive for Patient {assign.patient_id}. Escalated to Admin.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    
    # Seed default General Medicine doctors and ensure admin account
    try:
        from database import engine
    except ImportError:
        from .database import engine

    with Session(engine) as session:
        default_docs = [
            {"username": "dr.lewis", "full_name": "Dr. Daniel Lewis", "email": "dr.lewis@vitalguard.com", "specialty": "General Medicine", "role": "doctor"},
            {"username": "dr.walker", "full_name": "Dr. Grace Walker", "email": "dr.walker@vitalguard.com", "specialty": "General Medicine", "role": "doctor"},
            {"username": "dr.smith", "full_name": "Dr. Sarah Smith", "email": "dr.smith@vitalguard.com", "specialty": "General Medicine", "role": "doctor"},
        ]
        for doc_data in default_docs:
            existing = session.exec(select(User).where(User.username == doc_data["username"])).first()
            if not existing:
                hashed_pwd = get_password_hash("password123")
                new_doc = User(
                    username=doc_data["username"],
                    full_name=doc_data["full_name"],
                    email=doc_data["email"],
                    hashed_password=hashed_pwd,
                    role="doctor",
                    specialty=doc_data["specialty"],
                    availability="available",
                    is_active=True
                )
                session.add(new_doc)
            else:
                existing.full_name = doc_data["full_name"]
                session.add(existing)
        
        # Ensure admin account has role 'admin' and full_name
        admin_user = session.exec(select(User).where(User.username == "admin")).first()
        if admin_user:
            if admin_user.role != "admin":
                admin_user.role = "admin"
            admin_user.full_name = "Chief Medical Officer / Admin"
            session.add(admin_user)

        # Re-balance any existing pending assignments across distinct available doctors
        pending_assignments = session.exec(
            select(DoctorAssignment).where(DoctorAssignment.status == "pending")
        ).all()
        avail_docs = session.exec(
            select(User).where(User.role == "doctor", User.availability == "available")
        ).all()
        if not avail_docs:
            avail_docs = session.exec(select(User).where(User.role == "doctor")).all()

        if len(avail_docs) > 1 and len(pending_assignments) > 1:
            doc_ids_with_pending = [a.doctor_id for a in pending_assignments]
            if len(set(doc_ids_with_pending)) < len(pending_assignments):
                # Unbalanced pending assignments; re-distribute fairly across available doctors
                for idx, assign in enumerate(pending_assignments):
                    target_doc = avail_docs[idx % len(avail_docs)]
                    assign.doctor_id = target_doc.id
                    assign.attempted_doctor_ids = str(target_doc.id)
                    from datetime import datetime
                    assign.created_at = datetime.utcnow()
                    session.add(assign)

        session.commit()

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
    if current_user.role == "doctor":
        raise HTTPException(
            status_code=403,
            detail="Doctors are not permitted to register or admit new patients. Patient admission is handled by Administrative and Triage staff."
        )

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
    if current_user.role == "doctor":
        raise HTTPException(
            status_code=403,
            detail="Doctors are not permitted to delete patient records."
        )

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

    # 1. Check for Critical risk: Auto-dispatch to least-burdened doctor or update existing active dispatch
    if risk_level == "Critical" and db_assessment.patient_id:
        try:
            existing_active = session.exec(
                select(DoctorAssignment)
                .where(DoctorAssignment.patient_id == db_assessment.patient_id)
                .where(DoctorAssignment.status.in_(["pending", "acknowledged", "escalated_admin"]))
                .order_by(col(DoctorAssignment.created_at).desc())
            ).first()

            if existing_active:
                # Deduplication: Patient already has an active emergency dispatch!
                existing_active.assessment_id = db_assessment.id
                patient = session.get(Patient, db_assessment.patient_id)
                if patient and patient.room_number:
                    existing_active.room_number = patient.room_number
                session.add(existing_active)
                session.commit()
                print(f"[Auto-Dispatch Deduplicated] Updated active dispatch #{existing_active.id} for Patient {db_assessment.patient_id} with latest assessment #{db_assessment.id}")
            else:
                doc = select_best_available_doctor(session)
                if doc:
                    patient = session.get(Patient, db_assessment.patient_id)
                    room = patient.room_number if patient else None
                    from datetime import datetime
                    assignment = DoctorAssignment(
                        patient_id=db_assessment.patient_id,
                        doctor_id=doc.id,
                        assessment_id=db_assessment.id,
                        room_number=room,
                        status="pending",
                        attempted_doctor_ids=str(doc.id),
                        escalation_level=0,
                        created_at=datetime.utcnow()
                    )
                    session.add(assignment)
                    session.commit()
                    print(f"[Auto-Dispatch Load-Balanced] Patient {db_assessment.patient_id} (Room {room}) assigned to {format_doctor_display_name(doc)}")
        except Exception as e:
            print(f"Auto-dispatch error: {e}")

    # 2. Auto-resolve active critical dispatches if patient vitals stabilize
    elif risk_level in ["Stable", "Moderate"] and db_assessment.patient_id:
        try:
            active_assignments = session.exec(
                select(DoctorAssignment)
                .where(DoctorAssignment.patient_id == db_assessment.patient_id)
                .where(DoctorAssignment.status.in_(["pending", "acknowledged", "escalated_admin"]))
            ).all()
            for a in active_assignments:
                a.status = "resolved"
                session.add(a)
            if active_assignments:
                session.commit()
                print(f"[Auto-Stabilized] Patient {db_assessment.patient_id} stabilized to {risk_level}. Auto-resolved {len(active_assignments)} emergency dispatches.")
        except Exception as e:
            print(f"Auto-stabilize resolution error: {e}")

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

# --- Emergency Clinical Dispatch & Doctor Endpoints ---

@app.get("/doctors", response_model=List[UserRead])
def get_doctors(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    return session.exec(select(User).where(User.role == "doctor")).all()

@app.get("/doctor/assignments", response_model=List[DoctorAssignmentDetail])
def get_doctor_assignments(
    status_filter: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    # First: evaluate 60s timeout auto-escalation across active assignments
    check_and_escalate_assignments(session)

    query = select(DoctorAssignment)
    # Doctors see only assignments dispatched to them; admins see all dispatches
    if current_user.role == "doctor":
        query = query.where(DoctorAssignment.doctor_id == current_user.id)

    if status_filter:
        query = query.where(DoctorAssignment.status == status_filter)
    else:
        # Default: active dispatches (pending, acknowledged, or escalated_admin)
        query = query.where(DoctorAssignment.status.in_(["pending", "acknowledged", "escalated_admin"]))

    query = query.order_by(col(DoctorAssignment.created_at).desc())
    assignments = session.exec(query).all()

    now = datetime.utcnow()
    results = []
    for a in assignments:
        patient = session.get(Patient, a.patient_id)
        doctor = session.get(User, a.doctor_id)
        assessment = session.get(Assessment, a.assessment_id) if a.assessment_id else None
        vitals_dict = None
        if assessment:
            vitals_dict = {
                "heart_rate": assessment.heart_rate,
                "systolic_bp": assessment.systolic_bp,
                "respiratory_rate": assessment.respiratory_rate,
                "temperature": assessment.temperature,
                "spo2": assessment.spo2,
                "consciousness": assessment.consciousness,
                "risk_level": assessment.risk_level,
                "prediction_prob": assessment.prediction_prob,
            }

        seconds_remaining = None
        if a.status == "pending":
            elapsed = int((now - a.created_at).total_seconds())
            seconds_remaining = max(0, 60 - elapsed)

        results.append(DoctorAssignmentDetail(
            id=a.id,
            patient_id=a.patient_id,
            doctor_id=a.doctor_id,
            assessment_id=a.assessment_id,
            room_number=a.room_number or (patient.room_number if patient else None),
            status=a.status,
            created_at=a.created_at,
            acknowledged_at=a.acknowledged_at,
            patient_name=patient.name if patient else "Unknown",
            patient_age=patient.age if patient else None,
            patient_gender=patient.gender if patient else None,
            patient_mrn=patient.mrn if patient else None,
            doctor_name=format_doctor_display_name(doctor),
            doctor_full_name=format_doctor_display_name(doctor),
            doctor_specialty=getattr(doctor, "specialty", "General Medicine") if doctor else "General Medicine",
            seconds_remaining=seconds_remaining,
            vitals=vitals_dict
        ))
    return results

@app.post("/doctor/assignments/{assignment_id}/acknowledge")
def acknowledge_assignment(
    assignment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    assignment = session.get(DoctorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.status = "acknowledged"
    assignment.acknowledged_at = datetime.utcnow()
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return {"message": "Assignment acknowledged", "status": "acknowledged"}

@app.post("/doctor/assignments/{assignment_id}/decline")
def decline_assignment(
    assignment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    assignment = session.get(DoctorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    attempted = [int(x.strip()) for x in (assignment.attempted_doctor_ids or "").split(",") if x.strip().isdigit()]
    if assignment.doctor_id not in attempted:
        attempted.append(assignment.doctor_id)

    next_doctor = select_best_available_doctor(session, exclude_doctor_ids=attempted)
    if next_doctor:
        assignment.doctor_id = next_doctor.id
        assignment.created_at = datetime.utcnow()
        assignment.attempted_doctor_ids = ",".join(str(x) for x in attempted + [next_doctor.id])
        assignment.escalation_level = (assignment.escalation_level or 0) + 1
        session.add(assignment)
        session.commit()
        return {
            "message": f"Assignment declined. Re-assigned to {format_doctor_display_name(next_doctor)}",
            "status": "reassigned",
            "new_doctor": format_doctor_display_name(next_doctor)
        }
    else:
        admin_user = session.exec(select(User).where(User.role == "admin")).first()
        if admin_user:
            assignment.doctor_id = admin_user.id
            assignment.status = "escalated_admin"
            assignment.escalation_level = (assignment.escalation_level or 0) + 1
            session.add(assignment)
            session.commit()
            return {
                "message": "All clinicians currently busy or declined. Escalated to Chief Medical Officer.",
                "status": "escalated_admin",
                "new_doctor": "Chief Medical Officer / Admin"
            }
        raise HTTPException(status_code=400, detail="No other clinicians available to take this emergency")

@app.post("/doctor/assignments/{assignment_id}/resolve")
def resolve_assignment(
    assignment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    assignment = session.get(DoctorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.status = "resolved"
    session.add(assignment)
    session.commit()
    return {"message": "Assignment resolved"}

class AvailabilityUpdate(BaseModel):
    availability: str  # "available", "busy", "off_duty"

@app.get("/doctor/availability")
def get_doctor_availability(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "role": current_user.role,
        "specialty": getattr(current_user, "specialty", "General Medicine"),
        "availability": getattr(current_user, "availability", "available")
    }

@app.put("/doctor/availability")
def update_doctor_availability(
    avail_in: AvailabilityUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if avail_in.availability not in ["available", "busy", "off_duty"]:
        raise HTTPException(status_code=400, detail="Invalid availability status. Must be available, busy, or off_duty.")
    
    from datetime import datetime

    db_user = session.get(User, current_user.id)
    if db_user:
        db_user.availability = avail_in.availability
        session.add(db_user)
        session.commit()
        session.refresh(db_user)

    rerouted_count = 0
    if avail_in.availability in ["busy", "off_duty"]:
        # Instant shift handoff: Find all pending emergency dispatches for this doctor
        pending_assignments = session.exec(
            select(DoctorAssignment)
            .where(DoctorAssignment.doctor_id == current_user.id)
            .where(DoctorAssignment.status == "pending")
        ).all()

        for assignment in pending_assignments:
            attempted = [int(x.strip()) for x in (assignment.attempted_doctor_ids or "").split(",") if x.strip().isdigit()]
            if current_user.id not in attempted:
                attempted.append(current_user.id)

            next_doctor = select_best_available_doctor(session, exclude_doctor_ids=attempted)
            if next_doctor:
                assignment.doctor_id = next_doctor.id
                assignment.created_at = datetime.utcnow()
                assignment.attempted_doctor_ids = ",".join(str(x) for x in attempted + [next_doctor.id])
                assignment.escalation_level = (assignment.escalation_level or 0) + 1
                session.add(assignment)
                session.commit()
                rerouted_count += 1
                print(f"[Shift-Handoff] Re-routed pending dispatch #{assignment.id} from doctor #{current_user.id} to doctor #{next_doctor.id} ({format_doctor_display_name(next_doctor)})")
            else:
                admin_user = session.exec(select(User).where(User.role == "admin")).first()
                if admin_user:
                    assignment.doctor_id = admin_user.id
                    assignment.status = "escalated_admin"
                    assignment.escalation_level = (assignment.escalation_level or 0) + 1
                    session.add(assignment)
                    session.commit()
                    rerouted_count += 1
                    print(f"[Shift-Handoff] Escalated pending dispatch #{assignment.id} to Admin #{admin_user.id}")

    return {
        "message": "Availability updated successfully",
        "availability": avail_in.availability,
        "rerouted_dispatches": rerouted_count
    }

# --- Clinical E-Prescription Endpoints ---

@app.post("/prescriptions/", response_model=PrescriptionRead)
def create_prescription(
    presc_in: PrescriptionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    patient = session.get(Patient, presc_in.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    prescription = Prescription(
        patient_id=presc_in.patient_id,
        doctor_id=current_user.id,
        assignment_id=presc_in.assignment_id,
        medication_name=presc_in.medication_name,
        dosage=presc_in.dosage,
        route=presc_in.route or "Oral (PO)",
        frequency=presc_in.frequency or "TDS (3x/day)",
        duration=presc_in.duration or "3 days",
        instructions=presc_in.instructions
    )
    session.add(prescription)

    # If linked to an active assignment, mark assignment as attended/acknowledged
    if presc_in.assignment_id:
        assign = session.get(DoctorAssignment, presc_in.assignment_id)
        if assign and assign.status == "pending":
            assign.status = "acknowledged"
            assign.acknowledged_at = datetime.utcnow()
            session.add(assign)

    session.commit()
    session.refresh(prescription)

    return PrescriptionRead(
        id=prescription.id,
        patient_id=prescription.patient_id,
        doctor_id=prescription.doctor_id,
        assignment_id=prescription.assignment_id,
        medication_name=prescription.medication_name,
        dosage=prescription.dosage,
        route=prescription.route,
        frequency=prescription.frequency,
        duration=prescription.duration,
        instructions=prescription.instructions,
        created_at=prescription.created_at,
        doctor_name=current_user.username,
        patient_name=patient.name,
        room_number=patient.room_number
    )

@app.get("/prescriptions/", response_model=List[PrescriptionRead])
def get_prescriptions(
    patient_id: Optional[int] = None,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    query = select(Prescription)
    if patient_id:
        query = query.where(Prescription.patient_id == patient_id)
    query = query.order_by(col(Prescription.created_at).desc()).limit(limit)
    items = session.exec(query).all()

    results = []
    for p in items:
        doc = session.get(User, p.doctor_id)
        patient = session.get(Patient, p.patient_id)
        results.append(PrescriptionRead(
            id=p.id,
            patient_id=p.patient_id,
            doctor_id=p.doctor_id,
            assignment_id=p.assignment_id,
            medication_name=p.medication_name,
            dosage=p.dosage,
            route=p.route,
            frequency=p.frequency,
            duration=p.duration,
            instructions=p.instructions,
            created_at=p.created_at,
            doctor_name=doc.username if doc else "Dr. Staff",
            patient_name=patient.name if patient else "Unknown",
            room_number=patient.room_number if patient else None
        ))
    return results

@app.get("/admin/emergency-triage")
def get_admin_emergency_triage(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    # First: check and trigger 60s timeout auto-escalation
    check_and_escalate_assignments(session)
    now = datetime.utcnow()

    # 1. Check all patients to find all currently Critical / High Risk patients
    patients = session.exec(select(Patient)).all()
    critical_patients = []

    for patient in patients:
        latest_assessment = session.exec(
            select(Assessment)
            .where(Assessment.patient_id == patient.id)
            .order_by(col(Assessment.timestamp).desc())
        ).first()

        # Include if latest assessment indicates Critical risk
        if latest_assessment and latest_assessment.risk_level in ["Critical", "High Risk"]:
            # Find active assignment if any
            active_assign = session.exec(
                select(DoctorAssignment)
                .where(DoctorAssignment.patient_id == patient.id)
                .order_by(col(DoctorAssignment.created_at).desc())
            ).first()

            is_assigned = (active_assign is not None) and (active_assign.status != "resolved")
            doc = session.get(User, active_assign.doctor_id) if (active_assign and is_assigned) else None

            # Calculate seconds remaining before 60s timeout
            seconds_remaining = None
            if active_assign and active_assign.status == "pending" and active_assign.created_at:
                elapsed = int((now - active_assign.created_at).total_seconds())
                seconds_remaining = max(0, 60 - elapsed)

            # Find latest prescription / suggestion given for this patient
            latest_presc = session.exec(
                select(Prescription)
                .where(Prescription.patient_id == patient.id)
                .order_by(col(Prescription.created_at).desc())
            ).first()

            presc_dict = None
            if latest_presc:
                presc_doc = session.get(User, latest_presc.doctor_id)
                presc_dict = {
                    "id": latest_presc.id,
                    "medication_name": latest_presc.medication_name,
                    "dosage": latest_presc.dosage,
                    "route": latest_presc.route,
                    "frequency": latest_presc.frequency,
                    "duration": latest_presc.duration,
                    "instructions": latest_presc.instructions,
                    "doctor_name": format_doctor_display_name(presc_doc) if presc_doc else "Staff Clinician",
                    "created_at": latest_presc.created_at
                }

            vitals_dict = {
                "heart_rate": latest_assessment.heart_rate,
                "systolic_bp": latest_assessment.systolic_bp,
                "spo2": latest_assessment.spo2,
                "temperature": latest_assessment.temperature,
                "respiratory_rate": latest_assessment.respiratory_rate,
                "consciousness": latest_assessment.consciousness,
                "risk_level": latest_assessment.risk_level,
                "prediction_prob": latest_assessment.prediction_prob,
                "timestamp": latest_assessment.timestamp
            }

            critical_patients.append({
                "id": patient.id,
                "assignment_id": active_assign.id if (active_assign and is_assigned) else None,
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "mrn": patient.mrn,
                "room_number": active_assign.room_number if (active_assign and active_assign.room_number) else patient.room_number,
                "is_assigned": is_assigned,
                "doctor_id": doc.id if doc else None,
                "doctor_name": format_doctor_display_name(doc) if doc else None,
                "doctor_username": doc.username if doc else None,
                "doctor_specialty": getattr(doc, "specialty", "General Medicine") if doc else None,
                "assignment_status": active_assign.status if (active_assign and is_assigned) else "unassigned",
                "assigned_at": active_assign.created_at if (active_assign and is_assigned) else None,
                "seconds_remaining": seconds_remaining,
                "escalation_level": getattr(active_assign, "escalation_level", 0) if active_assign else 0,
                "is_escalated": (active_assign.status == "escalated_admin") if (active_assign and is_assigned) else False,
                "vitals": vitals_dict,
                "latest_suggestion": presc_dict
            })

    # Active assignments for legacy/direct reference
    active_assignments = session.exec(
        select(DoctorAssignment)
        .where(DoctorAssignment.status.in_(["pending", "acknowledged", "escalated_admin"]))
        .order_by(col(DoctorAssignment.created_at).desc())
    ).all()

    dispatches = []
    for a in active_assignments:
        p = session.get(Patient, a.patient_id)
        d = session.get(User, a.doctor_id)
        assessment = session.get(Assessment, a.assessment_id) if a.assessment_id else None
        vitals_dict = None
        if assessment:
            vitals_dict = {
                "heart_rate": assessment.heart_rate,
                "systolic_bp": assessment.systolic_bp,
                "spo2": assessment.spo2,
                "temperature": assessment.temperature,
                "respiratory_rate": assessment.respiratory_rate,
                "risk_level": assessment.risk_level,
                "prediction_prob": assessment.prediction_prob
            }

        assign_seconds_left = None
        if a.status == "pending" and a.created_at:
            elapsed = int((now - a.created_at).total_seconds())
            assign_seconds_left = max(0, 60 - elapsed)

        dispatches.append({
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": p.name if p else "Unknown",
            "patient_mrn": p.mrn if p else "N/A",
            "room_number": a.room_number or (p.room_number if p else None),
            "doctor_id": a.doctor_id,
            "doctor_name": format_doctor_display_name(d),
            "doctor_username": d.username if d else "unassigned",
            "doctor_specialty": getattr(d, "specialty", "General Medicine") if d else "General Medicine",
            "status": a.status,
            "seconds_remaining": assign_seconds_left,
            "escalation_level": getattr(a, "escalation_level", 0),
            "created_at": a.created_at,
            "acknowledged_at": a.acknowledged_at,
            "vitals": vitals_dict
        })

    # Doctors live status with live caseload
    doctors = session.exec(select(User).where(User.role == "doctor")).all()
    docs_status = []
    for doc in doctors:
        active_count = len(session.exec(
            select(DoctorAssignment)
            .where(DoctorAssignment.doctor_id == doc.id)
            .where(DoctorAssignment.status.in_(["pending", "acknowledged"]))
        ).all())
        docs_status.append({
            "id": doc.id,
            "username": doc.username,
            "full_name": format_doctor_display_name(doc),
            "email": doc.email,
            "specialty": getattr(doc, "specialty", "General Medicine"),
            "availability": getattr(doc, "availability", "available"),
            "active_caseload": active_count
        })

    # Latest 15 prescriptions
    prescs = session.exec(select(Prescription).order_by(col(Prescription.created_at).desc()).limit(15)).all()
    recent_prescriptions = []
    for p in prescs:
        pat = session.get(Patient, p.patient_id)
        doc_presc = session.get(User, p.doctor_id)
        recent_prescriptions.append({
            "id": p.id,
            "patient_id": p.patient_id,
            "medication_name": p.medication_name,
            "dosage": p.dosage,
            "route": p.route,
            "frequency": p.frequency,
            "duration": p.duration,
            "instructions": p.instructions,
            "patient_name": pat.name if pat else "Unknown",
            "room_number": pat.room_number if pat else None,
            "doctor_name": format_doctor_display_name(doc_presc) if doc_presc else "Staff Clinician",
            "created_at": p.created_at
        })

    return {
        "critical_patients": critical_patients,
        "active_dispatches": dispatches,
        "doctors_status": docs_status,
        "recent_prescriptions": recent_prescriptions
    }

class AdminReassignRequest(BaseModel):
    patient_id: int
    doctor_id: int
    assignment_id: Optional[int] = None

@app.post("/admin/emergency-triage/reassign")
def admin_reassign_patient(
    req: AdminReassignRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can manually reassign patients.")

    target_doctor = session.get(User, req.doctor_id)
    if not target_doctor or target_doctor.role != "doctor":
        raise HTTPException(status_code=400, detail="Target clinician not found or is not an active doctor.")

    patient = session.get(Patient, req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    from datetime import datetime

    assignment = None
    if req.assignment_id:
        assignment = session.get(DoctorAssignment, req.assignment_id)

    if not assignment:
        assignment = session.exec(
            select(DoctorAssignment)
            .where(DoctorAssignment.patient_id == req.patient_id)
            .where(DoctorAssignment.status.in_(["pending", "acknowledged", "escalated_admin"]))
            .order_by(col(DoctorAssignment.created_at).desc())
        ).first()

    if not assignment:
        # Create fresh assignment for this patient
        latest_assessment = session.exec(
            select(Assessment)
            .where(Assessment.patient_id == req.patient_id)
            .order_by(col(Assessment.timestamp).desc())
        ).first()

        assignment = DoctorAssignment(
            patient_id=req.patient_id,
            doctor_id=target_doctor.id,
            assessment_id=latest_assessment.id if latest_assessment else None,
            room_number=patient.room_number,
            status="pending",
            attempted_doctor_ids=str(target_doctor.id),
            escalation_level=0,
            created_at=datetime.utcnow()
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)
    else:
        attempted = [int(x.strip()) for x in (assignment.attempted_doctor_ids or "").split(",") if x.strip().isdigit()]
        if target_doctor.id not in attempted:
            attempted.append(target_doctor.id)

        assignment.doctor_id = target_doctor.id
        assignment.status = "pending"
        assignment.created_at = datetime.utcnow()
        assignment.attempted_doctor_ids = ",".join(str(x) for x in attempted)
        assignment.escalation_level = 0
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

    doc_name = format_doctor_display_name(target_doctor)
    print(f"[Admin Override] Patient #{patient.id} ({patient.name}) manually reassigned to {doc_name}")

    return {
        "message": f"Patient successfully assigned to {doc_name}",
        "assignment_id": assignment.id,
        "doctor_name": doc_name,
        "doctor_id": target_doctor.id,
        "status": assignment.status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
