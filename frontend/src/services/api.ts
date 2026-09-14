// Patient Types
export interface Patient {
    id: number;
    name: string;
    age: number;
    gender: 'M' | 'F';
    mrn: string;
    room_number?: string;
}

export interface PatientCreate {
    name: string;
    age: number;
    gender: 'M' | 'F';
    mrn?: string;
    room_number?: string;
}

export interface NextAllotment {
    next_id: number;
    next_room: string;
    next_mrn?: string;
}

// ... existing Vitals/Assessment interfaces ...

export interface Vitals {
  age?: number;
  gender?: 'M' | 'F';
  heart_rate: number;
  systolic_bp: number;
  spo2: number;
  temperature: number;
  respiratory_rate: number;
  consciousness: 'Alert' | 'Voice' | 'Pain' | 'Unresponsive' | 'Confusion';
}

export interface AssessmentData extends Vitals {
  patient_id: number;
  notes?: string;
}

export interface AssessmentResponse extends AssessmentData {
  id: number;
  risk_level: string;
  prediction_prob: number;
  analysis_text: string;
  timestamp: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('vitalguard_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// --- User Management API ---

export const getUsers = async () => {
    const response = await fetch(`${API_URL}/users`, {
        headers: { ...getAuthHeader() }
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return await response.json();
};

export const deleteUser = async (id: number) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete user');
    }
};

export const createUser = async (userData: any) => {
    // Note: register expects a user payload where hashed_password is the raw string
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeader() 
        },
        body: JSON.stringify(userData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create user');
    }
    return await response.json();
};

// --- Patient API ---

export const getPatients = async (): Promise<Patient[]> => {
    try {
        const response = await fetch(`${API_URL}/patients/?limit=100`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch patients');
        return await response.json();
    } catch (error) {
        console.error('Get Patients Error:', error);
        throw error;
    }
};

export const getNextAllotment = async (): Promise<NextAllotment> => {
    try {
        const response = await fetch(`${API_URL}/patients/next-allotment`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch next allotment info');
        return await response.json();
    } catch (error) {
        console.error('Get Next Allotment Error:', error);
        throw error;
    }
};

export const createPatient = async (patient: PatientCreate): Promise<Patient> => {
    try {
        const response = await fetch(`${API_URL}/patients/`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeader() 
            },
            body: JSON.stringify(patient)
        });
        if (!response.ok) throw new Error('Failed to create patient');
        return await response.json();
    } catch (error) {
        console.error('Create Patient Error:', error);
        throw error;
    }
};

export const updatePatient = async (id: number, patient: PatientCreate): Promise<Patient> => {
    try {
        const response = await fetch(`${API_URL}/patients/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeader() 
            },
            body: JSON.stringify(patient)
        });
        if (!response.ok) throw new Error('Failed to update patient');
        return await response.json();
    } catch (error) {
        console.error('Update Patient Error:', error);
        throw error;
    }
};

export const deletePatient = async (id: number): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/patients/${id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to delete patient');
    } catch (error) {
        console.error('Delete Patient Error:', error);
        throw error;
    }
};

// --- Assessment API ---

export const createAssessment = async (data: AssessmentData): Promise<AssessmentResponse> => {
    // Ensure numeric values
    const payload = {
        ...data,
        patient_id: Number(data.patient_id),
        heart_rate: Number(data.heart_rate),
        systolic_bp: Number(data.systolic_bp),
        spo2: Number(data.spo2),
        temperature: Number(data.temperature),
        respiratory_rate: Number(data.respiratory_rate),
    };

    try {
      const response = await fetch(`${API_URL}/assessments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload),
      });
  
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to create assessment');
      }
      return result;

    } catch (error) {
      console.error('Assessment API Error:', error);
      throw error;
    }
};

export const getPatientHistory = async (patientId: number): Promise<AssessmentResponse[]> => {
    try {
        const response = await fetch(`${API_URL}/assessments/${patientId}`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch history');
        return await response.json();
    } catch (error) {
        console.error('History API Error:', error);
        throw error;
    }
};

// ... existing imports ...

export interface DashboardStats {
    total_patients: number;
    high_risk_patients: number;
    stable_patients: number;
    ai_accuracy: number;
}

// ... existing functions ...

export const getDashboardStats = async (): Promise<DashboardStats> => {
    try {
        const response = await fetch(`${API_URL}/dashboard-stats`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    } catch (error) {
        console.error('Stats API Error:', error);
        throw error;
    }
};

// Legacy support if needed
export const predictRisk = async (vitals: any) => {
    return createAssessment({ ...vitals, patient_id: 1 }); // Fallback
};

// --- Emergency Clinical Dispatch & Prescription Interfaces ---

export interface DoctorAssignment {
    id: number;
    patient_id: number;
    doctor_id: number;
    assessment_id?: number;
    room_number?: string;
    status: 'pending' | 'acknowledged' | 'resolved' | 'escalated_admin';
    created_at: string;
    acknowledged_at?: string;
    patient_name?: string;
    patient_age?: number;
    patient_gender?: string;
    patient_mrn?: string;
    doctor_name?: string;
    doctor_full_name?: string;
    doctor_specialty?: string;
    seconds_remaining?: number;
    escalation_level?: number;
    vitals?: {
        heart_rate: number;
        systolic_bp: number;
        respiratory_rate: number;
        temperature: number;
        spo2: number;
        consciousness: string;
        risk_level: string;
        prediction_prob: number;
    };
}

export interface PrescriptionCreate {
    patient_id: number;
    assignment_id?: number;
    medication_name: string;
    dosage: string;
    route?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
}

export interface Prescription extends PrescriptionCreate {
    id: number;
    doctor_id: number;
    created_at: string;
    doctor_name?: string;
    patient_name?: string;
    room_number?: string;
}

export interface DoctorProfile {
    id: number;
    username: string;
    full_name?: string;
    email: string;
    role: string;
    specialty?: string;
    availability: 'available' | 'busy' | 'off_duty';
    active_caseload?: number;
}

export interface CriticalPatientRecord {
    id: number;
    assignment_id?: number;
    name: string;
    age: number;
    gender: string;
    mrn: string;
    room_number?: string;
    is_assigned: boolean;
    doctor_id?: number;
    doctor_name?: string;
    doctor_specialty?: string;
    assignment_status: 'pending' | 'acknowledged' | 'resolved' | 'unassigned' | 'escalated_admin';
    assigned_at?: string;
    seconds_remaining?: number;
    escalation_level?: number;
    is_escalated?: boolean;
    vitals: {
        heart_rate: number;
        systolic_bp: number;
        spo2: number;
        temperature: number;
        respiratory_rate: number;
        consciousness?: string;
        risk_level: string;
        prediction_prob: number;
        timestamp?: string;
    };
    latest_suggestion?: {
        id: number;
        medication_name: string;
        dosage: string;
        route: string;
        frequency: string;
        duration?: string;
        instructions?: string;
        doctor_name: string;
        created_at: string;
    };
}

export interface AdminEmergencyTriageData {
    critical_patients: CriticalPatientRecord[];
    active_dispatches: DoctorAssignment[];
    doctors_status: DoctorProfile[];
    recent_prescriptions: Prescription[];
}

// --- Emergency & Prescription API Calls ---

export const getDoctors = async (): Promise<DoctorProfile[]> => {
    const res = await fetch(`${API_URL}/doctors`, {
        headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch doctors');
    return await res.json();
};

export const getDoctorAssignments = async (statusFilter?: string): Promise<DoctorAssignment[]> => {
    const url = statusFilter ? `${API_URL}/doctor/assignments?status_filter=${statusFilter}` : `${API_URL}/doctor/assignments`;
    const res = await fetch(url, {
        headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch doctor assignments');
    return await res.json();
};

export const acknowledgeAssignment = async (id: number): Promise<{ message: string; status: string }> => {
    const res = await fetch(`${API_URL}/doctor/assignments/${id}/acknowledge`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to acknowledge assignment');
    return await res.json();
};

export const declineAssignment = async (id: number): Promise<{ message: string; status: string; new_doctor?: string }> => {
    const res = await fetch(`${API_URL}/doctor/assignments/${id}/decline`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to decline assignment');
    }
    return await res.json();
};

export const resolveAssignment = async (id: number): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/doctor/assignments/${id}/resolve`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to resolve assignment');
    return await res.json();
};

export const getDoctorAvailability = async (): Promise<{ username: string; role: string; specialty: string; availability: string }> => {
    const res = await fetch(`${API_URL}/doctor/availability`, {
        headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to get availability');
    return await res.json();
};

export const updateDoctorAvailability = async (availability: 'available' | 'busy' | 'off_duty'): Promise<{ message: string; availability: string }> => {
    const res = await fetch(`${API_URL}/doctor/availability`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({ availability })
    });
    if (!res.ok) throw new Error('Failed to update availability');
    return await res.json();
};

export const createPrescription = async (data: PrescriptionCreate): Promise<Prescription> => {
    const res = await fetch(`${API_URL}/prescriptions/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create prescription');
    }
    return await res.json();
};

export const getPrescriptions = async (patientId?: number): Promise<Prescription[]> => {
    const url = patientId ? `${API_URL}/prescriptions/?patient_id=${patientId}` : `${API_URL}/prescriptions/`;
    const res = await fetch(url, {
        headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch prescriptions');
    return await res.json();
};

export const getAdminEmergencyTriage = async (): Promise<AdminEmergencyTriageData> => {
    const res = await fetch(`${API_URL}/admin/emergency-triage`, {
        headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch emergency triage oversight');
    return await res.json();
};

export const adminReassignPatient = async (
    patientId: number,
    doctorId: number,
    assignmentId?: number
): Promise<{ message: string; assignment_id: number; doctor_name: string; doctor_id: number; status: string }> => {
    const res = await fetch(`${API_URL}/admin/emergency-triage/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
            patient_id: patientId,
            doctor_id: doctorId,
            assignment_id: assignmentId
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to reassign patient');
    }
    return await res.json();
};

