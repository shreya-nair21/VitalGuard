import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, Clock, AlertTriangle, CheckCircle, ShieldAlert, Stethoscope } from 'lucide-react';
import { getPatientHistory, getPatients, getPrescriptions, type AssessmentResponse, type Patient, type Prescription } from '../services/api';
import { getRiskConfig, RiskBadge } from '../utils/riskBadge';

const PatientHistory = () => {
  const location = useLocation();
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize with location state or default to 1, but make it stateful
  const [selectedPatientId, setSelectedPatientId] = useState<number>(location.state?.patient_id || 1);
  const [patients, setPatients] = useState<Patient[]>([]);

  // 1. Fetch all patients on mount to populate dropdown
  useEffect(() => {
    const fetchPatients = async () => {
        try {
            const list = await getPatients();
            setPatients(list);
        } catch (err) {
            console.error("Failed to load patient list", err);
        }
    };
    fetchPatients();
  }, []);

  // 2. Fetch history whenever selectedPatientId changes
  useEffect(() => {
    const fetchHistory = async () => {
        setLoading(true);
        try {
            const [historyData, prescData] = await Promise.all([
                getPatientHistory(selectedPatientId),
                getPrescriptions(selectedPatientId)
            ]);
            // Sort by timestamp desc
            const sorted = historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setAssessments(sorted);
            setPrescriptions(prescData);
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load history");
            setAssessments([]);
            setPrescriptions([]);
        } finally {
            setLoading(false);
        }
    };

    if (selectedPatientId) {
        fetchHistory();
    }
  }, [selectedPatientId]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  if (loading) return <div>Loading history...</div>;
  if (error) return (
    <div className="card" style={{ maxWidth: '500px', margin: '3rem auto', textAlign: 'center', padding: '2rem' }}>
      <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
      <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Unable to Load Patient History</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</p>
      <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ margin: '0 auto' }}>
        Retry Connection
      </button>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
        <h1 className="page-title">Patient History</h1>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', color: '#64748b', fontSize: '0.9rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <strong style={{ color: 'var(--text-main)' }}>Select Patient:</strong>
             <div style={{ position: 'relative' }}>
                <select 
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                    className="input-field"
                    style={{ 
                        padding: '0.5rem 2.5rem 0.5rem 1rem', 
                        fontSize: '0.9rem',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-main)',
                        borderColor: 'var(--border)',
                        cursor: 'pointer',
                        width: 'auto',
                        marginBottom: 0,
                        minWidth: '220px'
                    }}
                >
                    {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.id} - {p.name} (Room {p.room_number || 'N/A'})
                        </option>
                    ))}
                    {/* Fallback if patients not loaded yet or ID not in list */}
                    {!patients.find(p => p.id === selectedPatientId) && (
                        <option value={selectedPatientId}>Patient {selectedPatientId}</option>
                    )}
                </select>
             </div>
          </div>
          <span><strong style={{ color: 'var(--text-main)' }}>Total Assessments:</strong> {assessments.length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <div style={{ flex: '0 0 300px' }}>
          {selectedPatient && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Patient Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                  <strong>{selectedPatient.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Patient ID:</span>
                  <strong>#{selectedPatient.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Allotted Room:</span>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    backgroundColor: 'rgba(67, 56, 202, 0.08)',
                    color: '#4338ca',
                    borderRadius: '999px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    border: '1px solid rgba(67, 56, 202, 0.18)'
                  }}>
                    Room {selectedPatient.room_number || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
              <Activity size={18} style={{ marginRight: '0.5rem', color: '#4338ca' }} />
              Latest Vitals
            </h3>
            {assessments.length > 0 ? (
                <>
                    <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Heart Rate</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{assessments[0].heart_rate} bpm</div>
                    </div>
                    <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>O2 Saturation</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{assessments[0].spo2} %</div>
                    </div>
                </>
            ) : (
                <p>No data recorded.</p>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
           {/* Doctor's Immediate Suggestions & Prescriptions Section */}
           {prescriptions.length > 0 && (
             <div className="card" style={{ marginBottom: '2rem', border: '2px solid #c7d2fe', backgroundColor: '#f5f3ff', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                   <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Stethoscope size={20} />
                      Doctor's Clinical Suggestions & Prescribed Immediate Steps
                   </h3>
                   <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#4338ca', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                      {prescriptions.length} Orders
                   </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   {prescriptions.map((presc) => (
                      <div key={presc.id} style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                            <div>
                               <span style={{ fontWeight: 800, fontSize: '1rem', color: '#011e3b', marginRight: '0.5rem' }}>
                                  {presc.medication_name} ({presc.dosage})
                               </span>
                               <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#eef2ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px' }}>
                                  {presc.frequency} • {presc.route}
                               </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                               Prescribed by <strong>Dr. {presc.doctor_name || 'Staff'}</strong> • {new Date(presc.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                         </div>

                         {presc.instructions ? (
                            <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.8rem', backgroundColor: '#fffbeb', borderRadius: '4px', border: '1px solid #fde68a' }}>
                               <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                                  Immediate Clinical Advice / Instructions:
                               </div>
                               <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f', fontWeight: 600 }}>
                                  "{presc.instructions}"
                                </p>
                            </div>
                         ) : (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.25rem' }}>
                               Standard administration protocol applied.
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>
           )}

           <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
             <Clock size={24} style={{ marginRight: '0.75rem' }} />
             Assessment Timeline
           </h3>

           <div style={{ position: 'relative', paddingLeft: '2rem', borderLeft: '2px solid var(--border)' }}>
             
             {assessments.map((assessment) => {
                 const config = getRiskConfig(assessment.prediction_prob, assessment.risk_level);
                 const date = new Date(assessment.timestamp);
                 
                 return (
                    <div key={assessment.id} style={{ marginBottom: '2rem', position: 'relative' }}>
                        <div style={{ 
                            position: 'absolute', 
                            left: '-2.6rem', 
                            top: '0.25rem', 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '50%', 
                            backgroundColor: config.color, 
                            border: '4px solid var(--background)',
                            boxShadow: `0 0 0 1px ${config.color}`
                        }}></div>
                        <div className="card" style={{ borderColor: config.borderColor, backgroundColor: config.lightBg }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    <h4 style={{ fontWeight: 600, color: config.color, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                                        {config.tier === 'critical' ? (
                                          <ShieldAlert size={18} />
                                        ) : config.tier === 'high' ? (
                                          <AlertTriangle size={18} />
                                        ) : (
                                          <CheckCircle size={18} />
                                        )}
                                        {config.label} Assessment
                                    </h4>
                                    <RiskBadge 
                                      probability={assessment.prediction_prob} 
                                      riskLevel={assessment.risk_level} 
                                    />
                                    {typeof assessment.prediction_prob === 'number' && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        ({(assessment.prediction_prob > 1 ? assessment.prediction_prob : assessment.prediction_prob * 100).toFixed(0)}% Score)
                                      </span>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {date.toLocaleDateString()} {date.toLocaleTimeString()}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                <strong>Vitals:</strong> HR: {assessment.heart_rate} bpm | BP: {assessment.systolic_bp} mmHg | SpO2: {assessment.spo2}% | Temp: {assessment.temperature}°C
                            </p>
                            {assessment.analysis_text && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                                    Note: {assessment.analysis_text}
                                </p>
                            )}
                        </div>
                    </div>
                 );
             })}
             
             {assessments.length === 0 && (
                 <p>No history found for this patient.</p>
             )}

           </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHistory;
