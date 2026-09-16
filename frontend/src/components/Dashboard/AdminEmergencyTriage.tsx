import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Pill, CheckCircle2, AlertTriangle, ArrowRight, Stethoscope, Clock, UserCheck } from 'lucide-react';
import { adminReassignPatient, administerPrescription, type AdminEmergencyTriageData } from '../../services/api';
import { playEscalationAlert, shouldChimeForAssignment } from '../../utils/audioAlert';
import { toast } from 'sonner';

interface AdminEmergencyTriageProps {
  data: AdminEmergencyTriageData | null;
  loading: boolean;
  onRefresh?: () => void;
}

import { formatClinicianName } from '../../utils/formatDoctorName';
import { formatISTTime } from '../../utils/dateUtils';

export const AdminEmergencyTriage = ({ data, loading, onRefresh }: AdminEmergencyTriageProps) => {
  const [reassigningPatientId, setReassigningPatientId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [reassigning, setReassigning] = useState<boolean>(false);

  // e-MAR Administration state
  const [administeringPresc, setAdministeringPresc] = useState<{ id: number; medName: string; patientName: string } | null>(null);
  const [nurseName, setNurseName] = useState<string>('Staff Nurse');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [submittingAdmin, setSubmittingAdmin] = useState<boolean>(false);

  const handleAdminister = async () => {
    if (!administeringPresc) return;
    setSubmittingAdmin(true);
    try {
      await administerPrescription(administeringPresc.id, {
        administered_by: nurseName.trim() || 'Staff Nurse',
        notes: adminNotes.trim() || undefined
      });
      toast.success(`Administration recorded for ${administeringPresc.medName}`, {
        description: `Verified by ${nurseName.trim() || 'Staff Nurse'}`
      });
      setAdministeringPresc(null);
      setAdminNotes('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record administration');
    } finally {
      setSubmittingAdmin(false);
    }
  };

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

  const criticalPatients = (data?.critical_patients || []).filter(cp => cp.assignment_status !== 'resolved');
  const doctors = data?.doctors_status || [];

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Critical Patients Board */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} color="#dc2626" />
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Critical Patients
            </h2>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: criticalPatients.length > 0 ? '#fee2e2' : '#dcfce7',
              color: criticalPatients.length > 0 ? '#b91c1c' : '#15803d'
            }}>
              {criticalPatients.length > 0 ? `${criticalPatients.length} Active` : 'Stable'}
            </span>
          </div>
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
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Header Row: Patient Name + Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link
                      to="/app/history"
                      state={{ patient_id: cp.id }}
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: '#1e1b4b',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                      title="Click to view patient history"
                    >
                      {cp.name}
                      <ArrowRight size={14} color="#4338ca" />
                    </Link>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      ({cp.age}y, {cp.gender}{cp.mrn ? ` • MRN: ${cp.mrn}` : ''})
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c'
                    }}>
                      {cp.vitals?.risk_level?.toUpperCase() || 'CRITICAL'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Room Badge */}
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
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
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <AlertTriangle size={13} color="#dc2626" />
                        Escalated to Admin
                      </span>
                    ) : cp.is_assigned ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
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
                          {formatClinicianName(cp.doctor_name)} ({cp.assignment_status === 'pending' ? 'Pending' : 'Attending'})
                        </span>

                        {cp.assignment_status === 'pending' && cp.seconds_remaining !== undefined && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Clock size={11} />
                            {cp.seconds_remaining >= 60
                              ? `${Math.floor(cp.seconds_remaining / 60)}m ${cp.seconds_remaining % 60}s`
                              : `${cp.seconds_remaining}s`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                        Unassigned
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
                        gap: '0.3rem',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #c7d2fe',
                        backgroundColor: reassigningPatientId === cp.id ? '#4338ca' : '#eef2ff',
                        color: reassigningPatientId === cp.id ? '#ffffff' : '#4338ca',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Reassign to another doctor"
                    >
                      <UserCheck size={12} />
                      {reassigningPatientId === cp.id ? 'Cancel' : 'Reassign'}
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
                            {formatClinicianName(doc.full_name || doc.username)} ({doc.specialty}) • {doc.availability.toUpperCase()} • Caseload: {doc.active_caseload}
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
                    padding: '0.5rem 0.8rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                    fontSize: '0.78rem',
                    color: '#334155',
                    marginBottom: cp.latest_suggestion ? '0.65rem' : 0
                  }}>
                    <span>HR: <strong style={{ color: cp.vitals.heart_rate > 100 || cp.vitals.heart_rate < 50 ? '#dc2626' : '#011e3b' }}>{cp.vitals.heart_rate} bpm</strong></span>
                    <span>SpO2: <strong style={{ color: cp.vitals.spo2 < 92 ? '#dc2626' : '#011e3b' }}>{cp.vitals.spo2}%</strong></span>
                    <span>BP: <strong style={{ color: cp.vitals.systolic_bp < 90 || cp.vitals.systolic_bp > 140 ? '#dc2626' : '#011e3b' }}>{cp.vitals.systolic_bp} mmHg</strong></span>
                    <span>Temp: <strong style={{ color: cp.vitals.temperature > 38.5 ? '#dc2626' : '#011e3b' }}>{cp.vitals.temperature}°C</strong></span>
                    <span>RR: <strong style={{ color: cp.vitals.respiratory_rate > 24 || cp.vitals.respiratory_rate < 10 ? '#dc2626' : '#011e3b' }}>{cp.vitals.respiratory_rate}/min</strong></span>
                  </div>
                )}

                {/* Doctor's Immediate Steps / Suggestions (shown only when doctor prescribed orders) */}
                {cp.latest_suggestion && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#f8faff',
                    borderRadius: '4px',
                    border: '1px solid #c7d2fe',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: cp.latest_suggestion.instructions ? '0.25rem' : 0 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Stethoscope size={14} />
                          {cp.latest_suggestion.medication_name} ({cp.latest_suggestion.dosage}) • {cp.latest_suggestion.frequency}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          by {formatClinicianName(cp.latest_suggestion.doctor_name)}
                        </span>

                        {/* e-MAR Status Badge & Action */}
                        {cp.latest_suggestion.status === 'administered' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0'
                          }}>
                            <CheckCircle2 size={12} color="#16a34a" />
                            Given {cp.latest_suggestion.administered_at ? `(${formatISTTime(cp.latest_suggestion.administered_at, { includeZone: true })})` : ''}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a'
                            }}>
                              <Clock size={11} />
                              Pending
                            </span>

                            <button
                              onClick={() => setAdministeringPresc({
                                id: cp.latest_suggestion!.id,
                                medName: cp.latest_suggestion!.medication_name,
                                patientName: cp.name
                              })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: '#4338ca',
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                              title="Record administration"
                            >
                              <Pill size={11} />
                              Record
                            </button>
                          </div>
                        )}
                      </div>

                      {cp.latest_suggestion.instructions && (
                        <div style={{ fontSize: '0.78rem', color: '#4338ca', fontStyle: 'italic' }}>
                          "{cp.latest_suggestion.instructions}"
                        </div>
                      )}

                      {cp.latest_suggestion.administration_notes && (
                        <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600, marginTop: '0.15rem' }}>
                          Note: {cp.latest_suggestion.administration_notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: DOCTORS LIVE ROSTER */}
      <div style={{ marginBottom: '1.5rem' }}>
        {/* Doctors Live Duty Status */}
        <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} color="#4338ca" />
              Active Medical Staff & Clinicians
            </h3>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '0.75rem' 
          }}>
            {doctors.map((doc) => {
              const isAvail = doc.availability === 'available';
              const isBusy = doc.availability === 'busy';
              const statusLabel = isAvail ? 'Available' : isBusy ? 'In Consult' : 'Off Duty';
              const statusBg = isAvail ? '#dcfce7' : isBusy ? '#fef3c7' : '#f1f5f9';
              const statusColor = isAvail ? '#15803d' : isBusy ? '#b45309' : '#475569';
              const statusBorder = isAvail ? '#bbf7d0' : isBusy ? '#fde68a' : '#e2e8f0';
              const dotColor = isAvail ? '#22c55e' : isBusy ? '#f59e0b' : '#94a3b8';

              return (
                <div
                  key={doc.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#eef2ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#4338ca',
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}>
                      {doc.username.replace('dr.', '').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#011e3b' }}>
                        {formatClinicianName(doc.full_name || doc.username)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {doc.specialty || 'General Medicine'}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: statusBg,
                    color: statusColor,
                    border: `1px solid ${statusBorder}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    flexShrink: 0
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: dotColor
                    }} />
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* e-MAR Nurse Administration Modal */}
      {administeringPresc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(1, 30, 59, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #c7d2fe',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pill size={20} color="#4338ca" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#011e3b' }}>
                  Record Medication Administration (e-MAR)
                </h3>
              </div>
            </div>

            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Verify bedside medication administration for <strong>{administeringPresc.patientName}</strong>:
            </p>

            <div style={{
              padding: '0.75rem',
              backgroundColor: '#eef2ff',
              borderRadius: '4px',
              border: '1px solid #c7d2fe',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#312e81',
              marginBottom: '1rem'
            }}>
              Order: {administeringPresc.medName}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Administered By (Nurse / Clinician Name):
                </label>
                <input
                  type="text"
                  value={nurseName}
                  onChange={(e) => setNurseName(e.target.value)}
                  placeholder="e.g. Nurse Rachel Green, RN"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#011e3b',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Administration Clinical Notes (Optional):
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. IV push given over 2 mins. Patient tolerated well, vitals monitored."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#011e3b',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setAdministeringPresc(null);
                  setAdminNotes('');
                }}
                disabled={submittingAdmin}
                style={{
                  padding: '7px 14px',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminister}
                disabled={submittingAdmin}
                style={{
                  padding: '7px 16px',
                  borderRadius: '4px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: submittingAdmin ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <CheckCircle2 size={15} />
                {submittingAdmin ? 'Logging...' : 'Confirm Administration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
