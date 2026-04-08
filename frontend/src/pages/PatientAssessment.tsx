import { useLocation, useNavigate } from 'react-router-dom';
import { Info, Activity } from 'lucide-react';
import { createAssessment } from '../services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

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
  const initialPatientId = location.state?.patient_id || 1;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AssessmentFormValues>({
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

  const onSubmitForm = async (data: any) => {
    try {
        const result = await createAssessment(data as any);
        
        // Push a toast before navigating
        if (result.risk_level === 'High Risk' || result.risk_level === 'Critical') {
            toast.error(`CRITICAL ALERT: Model predicted ${result.risk_level}`, {
                description: `Patient requires immediate attention. Confidence: ${(result.prediction_prob * 100).toFixed(1)}%`,
                duration: 8000
            });
        } else {
            toast.success("Assessment submitted successfully");
        }
        
        // Navigate to Risk Assessment page with the result data
        navigate('/app/risk-assessment', { state: { result, vitals: data } });
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
          
          <div className="grid grid-cols-2">
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Patient ID *</label>
              <input 
                type="number" 
                className="input-field" 
                {...register("patient_id")}
              />
              {errors.patient_id && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.patient_id.message}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Room Number (Optional)</label>
              <input type="text" className="input-field" placeholder="e.g. 101" />
            </div>
          </div>
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
