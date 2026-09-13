import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Info, Activity } from 'lucide-react';
import { createAssessment, getPatients, type Patient } from '../services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { getRiskConfig } from '../utils/riskBadge';

const assessmentSchema = z.object({
  patient_id: z.coerce.number().min(1, "Patient ID is required"),
  heart_rate: z.coerce.number().min(20, "Rate too low").max(300, "Rate too high (max 300)"),
  systolic_bp: z.coerce.number().min(40, "BP too low").max(300, "BP too high (max 300)"),
  spo2: z.coerce.number().min(0, "Invalid SpO2").max(100, "SpO2 cannot exceed 100%"),
  respiratory_rate: z.coerce.number().min(0, "Invalid rate").max(100, "Rate too high"),
  temperature: z.coerce.number().min(25, "Temp too low").max(45, "Temp too high"),
  consciousness: z.enum(['Alert', 'Confusion', 'Voice', 'Pain', 'Unresponsive'])
});
type AssessmentFormValues = z.infer<typeof assessmentSchema>;

const PatientAssessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialPatientId = location.state?.patient_id ? Number(location.state.patient_id) : 1;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema) as any,
    defaultValues: {
      patient_id: initialPatientId,
      heart_rate: 75,
      systolic_bp: 120,
      spo2: 98,
      respiratory_rate: 16,
      temperature: 36.6,
      consciousness: 'Alert'
    }
  });

  const watchedPatientId = watch("patient_id");

  // Load patients and automatically select initial or first patient and sync room
  useEffect(() => {
    let isMounted = true;
    setIsLoadingPatients(true);
    getPatients()
      .then(list => {
        if (!isMounted) return;
        setPatients(list);
        if (list.length > 0) {
          const requestedId = location.state?.patient_id ? Number(location.state.patient_id) : null;
          const targetPatient = (requestedId ? list.find(p => p.id === requestedId) : null) || list[0];
          setValue("patient_id", targetPatient.id, { shouldValidate: true, shouldDirty: true });
        }
      })
      .catch(err => {
        console.error("Failed to load patients", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPatients(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location.state?.patient_id, setValue]);

  // Determine current active patient (falls back to list[0] so it is NEVER blank or checking indefinitely)
  const currentPatient = (
    patients.find(p => p.id === Number(watchedPatientId)) ||
    (location.state?.patient_id ? patients.find(p => p.id === Number(location.state.patient_id)) : null) ||
    (patients.length > 0 ? patients[0] : null)
  );

  const onSubmitForm = async (data: any) => {
    try {
        const result = await createAssessment(data as any);
        const config = getRiskConfig(result.prediction_prob, result.risk_level);
        
        // Push a toast before navigating
        if (config.tier === 'critical') {
            toast.error(`CRITICAL ALERT: Patient is Critical`, {
                description: `Patient requires immediate medical intervention. Confidence: ${(result.prediction_prob * 100).toFixed(1)}%`,
                duration: 8000
            });
        } else if (config.tier === 'high') {
            toast.error(`HIGH RISK ALERT: Model predicted ${result.risk_level}`, {
                description: `Patient requires close telemetry monitoring. Confidence: ${(result.prediction_prob * 100).toFixed(1)}%`,
                duration: 6000
            });
        } else if (config.tier === 'moderate') {
            toast.warning(`MODERATE RISK: Model predicted ${result.risk_level}`, {
                description: `Patient requires scheduled follow-up. Confidence: ${(result.prediction_prob * 100).toFixed(1)}%`,
                duration: 5000
            });
        } else {
            toast.success("Assessment submitted: Patient Stable");
        }
        
        // Navigate to Risk Assessment page with the result data and full patient context
        navigate('/app/risk-assessment', { state: { result, vitals: data, patient: currentPatient } });
    } catch (err: any) {
        toast.error(err.message || "Failed to submit assessment");
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Patient Assessment</h1>
        <p style={{ color: 'var(--text-muted)' }}>Enter clinical vitals to generate an AI risk prediction analysis.</p>
      </div>

      <div style={{ 
        backgroundColor: 'rgba(14, 165, 233, 0.1)', 
        border: '1px solid rgba(14, 165, 233, 0.2)', 
        borderRadius: '0.5rem', 
        padding: '1rem', 
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.75rem'
      }}>
        <Info color="#0ea5e9" size={24} style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>AI Reliability Note</h4>
          <p style={{ color: 'var(--text-main)', fontSize: '0.875rem' }}>
            Ensure all vitals are recorded within the last 15 minutes for the most accurate prediction results. Fields marked with * are required.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', color: 'var(--text-main)' }}>Patient Information</h3>
          
          <div className="grid grid-cols-2" style={{ gap: '1rem', alignItems: 'flex-start' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Patient *</label>
              <select 
                id="patient-select"
                className="input-field" 
                value={currentPatient?.id || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setValue("patient_id", id, { shouldValidate: true, shouldDirty: true });
                }}
                style={{
                  height: '46px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--input-bg)'
                }}
              >
                {isLoadingPatients && patients.length === 0 && (
                  <option value="">Loading patients...</option>
                )}
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.id} - {p.name} (Room {p.room_number || 'N/A'})
                  </option>
                ))}
              </select>
              {errors.patient_id && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.patient_id.message}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Allotted Room</label>
              <div style={{
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1rem',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                borderRadius: '8px',
                color: '#0ea5e9',
                fontWeight: 700,
                fontSize: '0.95rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#0ea5e9',
                    boxShadow: '0 0 6px #0ea5e9'
                  }} />
                  <span>
                    {currentPatient?.room_number 
                      ? `Room ${currentPatient.room_number}` 
                      : (isLoadingPatients ? 'Loading room...' : 'Room Unassigned')}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Auto-Allotted
                </span>
              </div>
            </div>
          </div>

          {currentPatient && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span>
                  <strong style={{ color: 'var(--text-muted)' }}>Selected Patient:</strong>{' '}
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{currentPatient.name}</span>
                </span>
                <span>
                  <strong style={{ color: 'var(--text-muted)' }}>Patient ID:</strong>{' '}
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>#{currentPatient.id}</span>
                </span>
                <span>
                  <strong style={{ color: 'var(--text-muted)' }}>Allotted Room:</strong>{' '}
                  <span style={{ color: '#0ea5e9', fontWeight: 700 }}>Room {currentPatient.room_number || 'N/A'}</span>
                </span>
                <span>
                  <strong style={{ color: 'var(--text-muted)' }}>Demographics:</strong>{' '}
                  <span style={{ color: 'var(--text-main)' }}>
                    {currentPatient.age} yrs, {currentPatient.gender === 'M' ? 'Male' : currentPatient.gender === 'F' ? 'Female' : currentPatient.gender}
                  </span>
                </span>
              </div>
              <span style={{
                fontSize: '0.75rem',
                color: '#22c55e',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                ✓ Auto-Loaded
              </span>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', color: 'var(--text-main)' }}>Clinical Vitals</h3>
          
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Heart Rate (BPM) *</label>
              <input 
                type="number" 
                className="input-field" 
                {...register("heart_rate")}
              />
              {errors.heart_rate && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.heart_rate.message}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Systolic BP (mmHg) *</label>
              <input 
                type="number" 
                className="input-field" 
                {...register("systolic_bp")}
              />
              {errors.systolic_bp && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.systolic_bp.message}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>O2 Saturation (%) *</label>
              <input 
                type="number" 
                className="input-field" 
                {...register("spo2")}
              />
              {errors.spo2 && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.spo2.message}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Respiratory Rate (breath/min) *</label>
              <input 
                type="number" 
                className="input-field" 
                {...register("respiratory_rate")}
              />
              {errors.respiratory_rate && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.respiratory_rate.message}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Temperature (°C)</label>
              <input 
                type="number" 
                step="0.1" 
                className="input-field" 
                {...register("temperature")}
              />
              {errors.temperature && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.temperature.message}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Consciousness Level</label>
              <select 
                className="input-field"
                {...register("consciousness")}
              >
                <option value="Alert">Alert</option>
                <option value="Confusion">Confusion</option>
                <option value="Voice">Voice</option>
                <option value="Pain">Pain</option>
                <option value="Unresponsive">Unresponsive</option>
              </select>
              {errors.consciousness && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.consciousness.message}</p>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn" style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border)' }} onClick={() => navigate('/app')}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ minWidth: '150px' }}
            disabled={isSubmitting}
          >
            <Activity size={18} style={{ marginRight: '0.5rem' }} />
            {isSubmitting ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientAssessment;
