import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Users, Pill, CheckCircle2, AlertTriangle, ArrowRight, Stethoscope, Clock, Volume2, VolumeX, UserCheck } from 'lucide-react';
import { adminReassignPatient, type AdminEmergencyTriageData } from '../../services/api';
import { isAudioEnabled, setAudioEnabled, playEscalationAlert, shouldChimeForAssignment } from '../../utils/audioAlert';
import { toast } from 'sonner';

interface AdminEmergencyTriageProps {
  data: AdminEmergencyTriageData | null;
  loading: boolean;
  onRefresh?: () => void;
}

const formatClinicianName = (name?: string) => {
  if (!name) return 'Staff Clinician';
  if (name.includes('Chief Medical Officer') || name.includes('Admin')) {
    return name;
  }
  if (name.toLowerCase().startsWith('dr.')) {
    const cleaned = name.slice(3).trim();
    return `Dr. ${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)}`;
  }
  return `Dr. ${name}`;
};

export const AdminEmergencyTriage = ({ data, loading, onRefresh }: AdminEmergencyTriageProps) => {
  const [audioActive, setAudioActive] = useState<boolean>(isAudioEnabled());
  const [reassigningPatientId, setReassigningPatientId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [reassigning, setReassigning] = useState<boolean>(false);

  // Synchronize audio state across components
  useEffect(() => {
    const handleToggle = (e: any) => {
      setAudioActive(e.detail?.enabled ?? isAudioEnabled());
    };
    window.addEventListener('vitalguard-audio-toggle', handleToggle);
    return () => window.removeEventListener('vitalguard-audio-toggle', handleToggle);
  }, []);

  // Play escalation audio alert when a patient reaches escalated_admin status
  useEffect(() => {
    if (!data?.critical_patients) return;
    for (const cp of data.critical_patients) {
      if (cp.is_escalated || cp.assignment_status === 'escalated_admin') {
        const idToTrack = cp.assignment_id || cp.id;
        if (shouldChimeForAssignment(idToTrack, 'escalated_admin')) {
          playEscalationAlert();
          break;
        }
      }
    }
  }, [data]);

  const handleReassign = async (patientId: number, assignmentId?: number) => {
    if (!selectedDoctorId) {
      toast.error('Please select a doctor to assign');
      return;
    }
    setReassigning(true);
    try {
      const res = await adminReassignPatient(patientId, selectedDoctorId, assignmentId);
      toast.success(res.message, {
        description: 'Response countdown timer has been reset for the assigned doctor.'
      });
      setReassigningPatientId(null);
      setSelectedDoctorId(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reassign patient');
    } finally {
      setReassigning(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b', marginBottom: '2rem' }}>
        Loading real-time hospital triage data...
      </div>
    );
  }

  const criticalPatients = data?.critical_patients || [];
  const doctors = data?.doctors_status || [];
  const prescriptions = data?.recent_prescriptions || [];

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Top Banner: Emergency Triage Status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldAlert size={24} color="#dc2626" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#011e3b' }}>
              Hospital Emergency Triage & Doctor Dispatch Oversight
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Continuous real-time surveillance of fluctuating vitals, doctor assignments, and clinical orders.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const nextState = !audioActive;
              setAudioActive(nextState);
              setAudioEnabled(nextState);
              toast.info(nextState ? 'Audio telemetry alerts enabled' : 'Audio alerts muted');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '6px 12px',
              borderRadius: '4px',
              border: `1px solid ${audioActive ? '#bbf7d0' : '#e2e8f0'}`,
              backgroundColor: audioActive ? '#f0fdf4' : '#f8fafc',
              color: audioActive ? '#15803d' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
            title="Toggle audible hospital telemetry alerts"
          >
            {audioActive ? <Volume2 size={15} color="#16a34a" /> : <VolumeX size={15} color="#94a3b8" />}
            Audio Alerts: {audioActive ? 'Active' : 'Muted'}
          </button>

          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            Live Auto-Sync Active (4s polling)
          </span>
        </div>
      </div>

      {/* SECTION 1: CRITICAL PATIENTS BOARD (Displays all critical patients e.g. 2 or more) */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #fecaca', backgroundColor: '#fff5f5', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} color="#dc2626" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#991b1b' }}>
              Currently Critical Patients ({criticalPatients.length})
            </h3>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '4px',
            backgroundColor: criticalPatients.length > 0 ? '#dc2626' : '#16a34a',
            color: '#ffffff'
          }}>
            {criticalPatients.length > 0 ? `${criticalPatients.length} IMMEDIATE ATTENTION REQUIRED` : 'ALL PATIENTS STABLE'}
          </span>
        </div>

        {criticalPatients.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <CheckCircle2 size={26} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
            No patients currently in Critical condition. Hospital telemetry baseline stable.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {criticalPatients.map((cp) => (
              <div
                key={cp.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid',
                  borderColor: cp.is_escalated ? '#dc2626' : cp.is_assigned ? '#fca5a5' : '#ef4444',
                  boxShadow: cp.is_escalated ? '0 4px 12px rgba(220, 38, 38, 0.15)' : '0 2px 4px rgba(220, 38, 38, 0.06)'
                }}
              >
                {/* Header Row: Patient Name (Clickable link) + Room + Assignment Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Link
                        to="/app/history"
                        state={{ patient_id: cp.id }}
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: '#4338ca',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                        title="Click to view current vitals and doctor suggestions"
                      >
                        {cp.name}
                        <ArrowRight size={16} />
                      </Link>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                        ({cp.age}y, {cp.gender} • MRN: {cp.mrn})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, marginTop: '0.15rem' }}>
                      Fluctuating Vitals Detected • Risk: {cp.vitals?.risk_level?.toUpperCase() || 'CRITICAL'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Room Badge */}
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: '#eef2ff',
                      color: '#4338ca',
                      border: '1px solid #c7d2fe'
                    }}>
                      Room {cp.room_number || 'N/A'}
                    </span>

                    {/* Escalated to Admin Badge */}
                    {cp.is_escalated || cp.assignment_status === 'escalated_admin' ? (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1.5px solid #dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <AlertTriangle size={14} color="#dc2626" />
                        ESCALATED TO CHIEF MEDICAL OFFICER (Clinicians Unresponsive)
                      </span>
                    ) : cp.is_assigned ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: cp.assignment_status === 'pending' ? '#fef3c7' : '#dcfce7',
                          color: cp.assignment_status === 'pending' ? '#b45309' : '#15803d',
                          border: '1px solid',
                          borderColor: cp.assignment_status === 'pending' ? '#fde68a' : '#bbf7d0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: cp.assignment_status === 'pending' ? '#f59e0b' : '#22c55e'
                          }} />
                          Assigned to {formatClinicianName(cp.doctor_name)} ({cp.assignment_status === 'pending' ? 'Pending Acknowledge' : 'In Attendance'})
                        </span>

                        {cp.assignment_status === 'pending' && cp.seconds_remaining !== undefined && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <Clock size={12} />
                            Re-routes in: {cp.seconds_remaining}s
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                        Waiting for Available Doctor (Unassigned)
                      </span>
                    )}

                    {/* Reassign Doctor Action Button */}
                    <button
                      onClick={() => {
                        if (reassigningPatientId === cp.id) {
                          setReassigningPatientId(null);
                          setSelectedDoctorId(null);
                        } else {
                          setReassigningPatientId(cp.id);
                          const firstAvail = doctors.find(d => d.availability === 'available' && d.id !== cp.doctor_id);
                          setSelectedDoctorId(firstAvail ? firstAvail.id : (doctors[0]?.id || null));
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid #c7d2fe',
                        backgroundColor: reassigningPatientId === cp.id ? '#4338ca' : '#eef2ff',
                        color: reassigningPatientId === cp.id ? '#ffffff' : '#4338ca',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Override automatic allotment and assign this patient to a specific doctor"
                    >
                      <UserCheck size={13} />
                      {reassigningPatientId === cp.id ? 'Cancel Reassign' : 'Reassign Doctor'}
                    </button>
                  </div>
                </div>

                {/* Inline Reassignment Control Panel */}
                {reassigningPatientId === cp.id && (
                  <div style={{
                    margin: '0.75rem 0',
                    padding: '0.85rem 1rem',
                    backgroundColor: '#eef2ff',
                    borderRadius: '4px',
                    border: '1.5px solid #818cf8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#312e81', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Stethoscope size={15} color="#4338ca" />
                        Admin Override: Assign {cp.name} to Specialist / Clinician
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>
                        Current Clinician: {formatClinicianName(cp.doctor_name)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={selectedDoctorId ?? ''}
                        onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                        style={{
                          flex: 1,
                          minWidth: '240px',
                          padding: '6px 10px',
                          fontSize: '0.82rem',
                          borderRadius: '4px',
                          border: '1px solid #a5b4fc',
                          backgroundColor: '#ffffff',
                          color: '#011e3b',
                          fontWeight: 600
                        }}
                      >
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.full_name} ({doc.specialty}) • {doc.availability.toUpperCase()} • Caseload: {doc.active_caseload}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleReassign(cp.id, cp.assignment_id)}
                        disabled={reassigning || !selectedDoctorId}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '4px',
                          backgroundColor: '#4338ca',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          border: 'none',
                          cursor: reassigning ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        {reassigning ? 'Assigning...' : 'Confirm Assignment'}
                      </button>

                      <button
                        onClick={() => {
                          setReassigningPatientId(null);
                          setSelectedDoctorId(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Vitals Snapshot */}
                {cp.vitals && (
                  <div style={{
                    padding: '0.6rem 0.9rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                    fontSize: '0.8rem',
                    color: '#011e3b',
                    marginBottom: '0.75rem'
                  }}>
                    <span>Heart Rate: <strong style={{ color: cp.vitals.heart_rate > 100 || cp.vitals.heart_rate < 50 ? '#dc2626' : '#011e3b' }}>{cp.vitals.heart_rate} bpm</strong></span>
                    <span>SpO2: <strong style={{ color: cp.vitals.spo2 < 92 ? '#dc2626' : '#011e3b' }}>{cp.vitals.spo2}%</strong></span>
                    <span>Blood Pressure: <strong>{cp.vitals.systolic_bp} mmHg</strong></span>
                    <span>Temp: <strong style={{ color: cp.vitals.temperature > 38.5 ? '#dc2626' : '#011e3b' }}>{cp.vitals.temperature}°C</strong></span>
                    <span>Resp Rate: <strong>{cp.vitals.respiratory_rate}/min</strong></span>
                  </div>
                )}

                {/* Doctor's Immediate Steps / Suggestions Preview */}
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: cp.latest_suggestion ? '#f5f3ff' : '#f8fafc',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: cp.latest_suggestion ? '#c7d2fe' : '#e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {cp.latest_suggestion ? (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <Stethoscope size={14} />
                        Doctor's Order: {cp.latest_suggestion.medication_name} ({cp.latest_suggestion.dosage}) • {cp.latest_suggestion.frequency} by {formatClinicianName(cp.latest_suggestion.doctor_name)}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#3730a3', fontStyle: 'italic', fontWeight: 600 }}>
                        "{cp.latest_suggestion.instructions || 'Standard emergency monitoring'}"
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                      ⏳ Awaiting doctor's clinical orders & suggestions for this patient...
                    </div>
                  )}

                  <Link
                    to="/app/history"
                    state={{ patient_id: cp.id }}
                    className="btn"
                    style={{
                      fontSize: '0.8rem',
                      padding: '5px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #c7d2fe',
                      color: '#4338ca',
                      fontWeight: 700,
                      borderRadius: '4px'
                    }}
                  >
                    View Current Vitals & Suggestions →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: DOCTORS LIVE ROSTER + PRESCRIPTIONS AUDIT TRAIL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Doctors Live Duty Status */}
        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#4338ca" />
              General Medicine Clinicians ({doctors.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Live Duty & Caseload</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {doctors.map((doc) => {
              const isAvail = doc.availability === 'available';
              const isBusy = doc.availability === 'busy';

              return (
                <div
                  key={doc.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '4px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: '#eef2ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#4338ca',
                      fontSize: '0.85rem'
                    }}>
                      {doc.username.replace('dr.', '').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#011e3b' }}>
                        {formatClinicianName(doc.full_name || doc.username)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {doc.specialty || 'General Medicine'} • Active Caseload: <strong style={{ color: '#011e3b' }}>{doc.active_caseload ?? 0}</strong>
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    backgroundColor: isAvail ? '#dcfce7' : isBusy ? '#fef3c7' : '#f1f5f9',
                    color: isAvail ? '#15803d' : isBusy ? '#b45309' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isAvail ? '#22c55e' : isBusy ? '#f59e0b' : '#94a3b8'
                    }} />
                    {isAvail ? 'Available' : isBusy ? 'In Consultation' : 'Off Duty'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Prescriptions Log */}
        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Pill size={18} color="#4338ca" />
              Latest Doctor Orders & Prescriptions ({prescriptions.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Audit Log</span>
          </div>

          {prescriptions.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No doctor orders recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
              {prescriptions.map((p) => (
                <div key={p.id} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#011e3b' }}>
                      {p.medication_name} ({p.dosage})
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#4338ca', fontWeight: 700 }}>
                      {p.room_number ? `Room ${p.room_number}` : p.patient_name}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {formatClinicianName(p.doctor_name)} • {p.frequency} ({p.route}) • {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {p.instructions && (
                    <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', marginTop: '0.2rem' }}>
                      "{p.instructions}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
