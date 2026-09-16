import { useState, useEffect } from 'react';
import { ShieldAlert, Heart, Activity, Thermometer, Wind, Check, Pill, ChevronRight, FileText, CheckCircle2, AlertTriangle, Clock, XCircle, Volume2, VolumeX } from 'lucide-react';
import { acknowledgeAssignment, declineAssignment, resolveAssignment, getPatientHistory, getPrescriptions, type DoctorAssignment, type AssessmentResponse, type Prescription } from '../../services/api';
import { isAudioEnabled, setAudioEnabled, playEmergencyChime, shouldChimeForAssignment } from '../../utils/audioAlert';
import { PrescriptionModal } from './PrescriptionModal';
import { CareSchedule } from './CareSchedule';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatClinicianName } from '../../utils/formatDoctorName';
import { formatISTTime } from '../../utils/dateUtils';

interface DoctorWorkstationProps {
  doctorName: string;
  assignments: DoctorAssignment[];
  availability: 'available' | 'busy' | 'off_duty';
  onAvailabilityChange: (status: 'available' | 'busy' | 'off_duty') => void;
  onRefresh: () => void;
}

export const DoctorWorkstation = ({
  doctorName,
  assignments,
  availability,
  onAvailabilityChange,
  onRefresh
}: DoctorWorkstationProps) => {
  const [activePrescriptionAssignment, setActivePrescriptionAssignment] = useState<DoctorAssignment | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [audioActive, setAudioActive] = useState<boolean>(isAudioEnabled());

  // Specific assigned patient observation state
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientAssessments, setPatientAssessments] = useState<AssessmentResponse[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);

  // Synchronize audio state across components
  useEffect(() => {
    const handleToggle = (e: any) => {
      setAudioActive(e.detail?.enabled ?? isAudioEnabled());
    };
    window.addEventListener('vitalguard-audio-toggle', handleToggle);
    return () => window.removeEventListener('vitalguard-audio-toggle', handleToggle);
  }, []);

  // Play auditory emergency chime when a pending dispatch arrives
  useEffect(() => {
    if (!assignments || assignments.length === 0) return;
    for (const a of assignments) {
      if (a.status === 'pending') {
        if (shouldChimeForAssignment(a.id, 'pending')) {
          playEmergencyChime();
          break;
        }
      }
    }
  }, [assignments]);

  // Automatically select the assigned patient
  useEffect(() => {
    if (assignments.length > 0) {
      const stillExists = assignments.some(a => a.patient_id === selectedPatientId);
      if (!stillExists || !selectedPatientId) {
        setSelectedPatientId(assignments[0].patient_id);
      }
    } else {
      setSelectedPatientId(null);
      setPatientAssessments([]);
    }
  }, [assignments, selectedPatientId]);

  // Fetch telemetry history specifically for the selected assigned patient
  useEffect(() => {
    if (!selectedPatientId) {
      setPatientAssessments([]);
      return;
    }
    let active = true;
    getPatientHistory(selectedPatientId)
      .then((history) => {
        if (active) {
          const sorted = (history || []).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setPatientAssessments(sorted);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch patient history for doctor workstation:', err);
      });
    return () => {
      active = false;
    };
  }, [selectedPatientId]);

  // Fetch e-MAR medication orders and administration status for the selected patient
  useEffect(() => {
    if (!selectedPatientId) {
      setPatientPrescriptions([]);
      return;
    }
    let active = true;
    getPrescriptions(selectedPatientId)
      .then((prescs) => {
        if (active) setPatientPrescriptions(prescs || []);
      })
      .catch((err) => console.error('Failed to fetch patient prescriptions:', err));
    return () => {
      active = false;
    };
  }, [selectedPatientId, assignments]);

  const selectedAssignment = assignments.find(a => a.patient_id === selectedPatientId);

  const formattedDoctorTitle = formatClinicianName(doctorName);

  const handleAcknowledge = async (id: number) => {
    setProcessingId(id);
    try {
      await acknowledgeAssignment(id);
      toast.success('Emergency assignment acknowledged', {
        description: 'Status updated to In Attendance.',
        icon: <CheckCircle2 size={16} />
      });
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to acknowledge');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await declineAssignment(id);
      toast.info(res.message || 'Assignment re-routed to next available doctor');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to re-route assignment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolve = async (id: number) => {
    setProcessingId(id);
    try {
      await resolveAssignment(id);
      toast.success('Patient marked as stabilized & emergency resolved');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve');
    } finally {
      setProcessingId(null);
    }
  };

  // Immediate clinical rule helper
  const getImmediateAdvice = (vitals?: DoctorAssignment['vitals']) => {
    if (!vitals) return 'Initiate immediate bedside telemetry evaluation and review airway, breathing, circulation.';
    const actions: string[] = [];
    if (vitals.spo2 < 90) actions.push('Critical Hypoxia: Administer high-flow Oxygen cannula (target SpO2 > 94%).');
    if (vitals.temperature > 38.5) actions.push('Severe Pyrexia: Administer antipyretic (Crocin / Paracetamol 650mg PO/IV) immediately.');
    if (vitals.systolic_bp < 90) actions.push('Hypotension Alert: Start IV Normal Saline fluid bolus 500ml.');
    if (vitals.heart_rate > 120) actions.push('Tachycardia: Check ECG rhythm and continuous cardiac monitoring.');
    if (vitals.consciousness && vitals.consciousness !== 'Alert') actions.push('Altered Mental Status: Check capillary blood glucose and neurological reflexes.');
    return actions.length > 0 ? actions.join(' ') : 'Monitor vitals every 30 minutes and maintain baseline observation.';
  };

  return (
    <div>
      {/* Doctor Workstation Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
            {formattedDoctorTitle}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Audio Alerts Toggle */}
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
            Audio: {audioActive ? 'Active' : 'Muted'}
          </button>

          {/* Duty Status Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: '#ffffff',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Duty Status:
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => onAvailabilityChange('available')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: availability === 'available' ? '#22c55e' : '#e2e8f0',
                backgroundColor: availability === 'available' ? '#dcfce7' : '#ffffff',
                color: availability === 'available' ? '#15803d' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              Available
            </button>

            <button
              onClick={() => onAvailabilityChange('busy')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: availability === 'busy' ? '#f59e0b' : '#e2e8f0',
                backgroundColor: availability === 'busy' ? '#fef3c7' : '#ffffff',
                color: availability === 'busy' ? '#b45309' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              In Consult
            </button>

            <button
              onClick={() => onAvailabilityChange('off_duty')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: availability === 'off_duty' ? '#94a3b8' : '#e2e8f0',
                backgroundColor: availability === 'off_duty' ? '#f1f5f9' : '#ffffff',
                color: availability === 'off_duty' ? '#334155' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8' }} />
              Off Duty
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* SECTION 1: ASSIGNED CRITICAL PATIENTS & IMMEDIATE ACTION */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#011e3b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={22} color="#dc2626" />
            Critical Patients Dispatched to You ({assignments.length})
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Live Emergency Queue
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#011e3b' }}>
              No Active Emergency Dispatches
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              You are currently on active standby. When a patient's vitals turn Critical, they will be automatically dispatched to your workstation here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {assignments.map((assignment) => {
              const isPending = assignment.status === 'pending';
              const vitals = assignment.vitals;
              const immediateAdvice = getImmediateAdvice(vitals);

              return (
                <div
                  key={assignment.id}
                  className="card"
                  style={{
                    margin: 0,
                    border: '2px solid',
                    borderColor: isPending ? '#dc2626' : '#f59e0b',
                    backgroundColor: isPending ? '#fef2f2' : '#fffbeb',
                    padding: '1.5rem',
                    boxShadow: isPending ? '0 10px 25px -5px rgba(220, 38, 38, 0.15)' : '0 4px 6px -1px rgba(245, 158, 11, 0.1)'
                  }}
                >
                  {/* Top Bar: Patient Details & Room Number */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: isPending ? '#dc2626' : '#f59e0b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ShieldAlert size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            backgroundColor: isPending ? '#dc2626' : '#f59e0b',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {isPending ? 'CRITICAL DISPATCH • ACTION REQUIRED' : 'IN ATTENDANCE'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Dispatched {formatISTTime(assignment.created_at, { includeZone: true })}
                          </span>
                          {isPending && assignment.seconds_remaining !== undefined && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              <Clock size={12} />
                              Auto-escalates in: {assignment.seconds_remaining >= 60
                                ? `${Math.floor(assignment.seconds_remaining / 60)}m ${assignment.seconds_remaining % 60}s`
                                : `${assignment.seconds_remaining}s`}
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#011e3b' }}>
                          {assignment.patient_name} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748b' }}>({assignment.patient_age} yrs, {assignment.patient_gender} • MRN: {assignment.patient_mrn})</span>
                        </h3>
                      </div>
                    </div>

                    <div style={{
                      padding: '6px 16px',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Allotted Room</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#4338ca' }}>
                        Room {assignment.room_number || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Immediate Clinical Alert: What to be done immediately */}
                  <div style={{
                    padding: '0.85rem 1.1rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    border: '1px solid #fca5a5',
                    marginBottom: '1rem',
                    borderLeft: '4px solid #dc2626'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={15} /> Immediate Clinical Protocol:
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d', fontWeight: 600, lineHeight: 1.5 }}>
                      {immediateAdvice}
                    </p>
                  </div>

                  {/* Vitals Snapshot */}
                  {vitals && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                      gap: '0.75rem',
                      backgroundColor: '#ffffff',
                      padding: '1rem',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '1.25rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                          <Heart size={13} color="#dc2626" /> Heart Rate
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: vitals.heart_rate > 100 || vitals.heart_rate < 50 ? '#dc2626' : '#011e3b' }}>
                          {vitals.heart_rate} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>bpm</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                          <Activity size={13} color="#4338ca" /> SpO2
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: vitals.spo2 < 92 ? '#dc2626' : '#011e3b' }}>
                          {vitals.spo2} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>%</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                          <Activity size={13} color="#059669" /> Blood Press.
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#011e3b' }}>
                          {vitals.systolic_bp} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>mmHg</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                          <Thermometer size={13} color="#f59e0b" /> Temperature
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: vitals.temperature > 38.5 ? '#dc2626' : '#011e3b' }}>
                          {vitals.temperature} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>°C</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                          <Wind size={13} color="#6366f1" /> Resp Rate
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#011e3b' }}>
                          {vitals.respiratory_rate} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/min</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Latest Clinical Orders & Bedside Administration Tracking (e-MAR) */}
                  {patientPrescriptions.length > 0 && (
                    <div style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '1.25rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                        <Pill size={14} /> Active Clinical Orders & e-MAR Bedside Status:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {patientPrescriptions.slice(0, 2).map((p) => {
                          const isAdministered = p.status === 'administered';
                          return (
                            <div key={p.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              backgroundColor: '#ffffff',
                              borderRadius: '4px',
                              border: '1px solid',
                              borderColor: isAdministered ? '#bbf7d0' : '#fde68a'
                            }}>
                              <div>
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#011e3b' }}>
                                  {p.medication_name} ({p.dosage})
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.4rem' }}>
                                  • {p.frequency} ({p.route})
                                </span>
                                {p.instructions && (
                                  <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', marginTop: '0.15rem' }}>
                                    "{p.instructions}"
                                  </div>
                                )}
                              </div>

                              <div>
                                {isAdministered ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0'
                                  }}>
                                    <CheckCircle2 size={12} color="#16a34a" />
                                    Administered by {p.administered_by || 'Staff'} {p.administered_at ? `(${formatISTTime(p.administered_at, { includeZone: true })})` : ''}
                                  </span>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: '#fef3c7',
                                    color: '#b45309',
                                    border: '1px solid #fde68a'
                                  }}>
                                    <Clock size={12} />
                                    Ordered (Pending Bedside Administration)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Doctor */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {/* View Full History Link/Button */}
                    <Link
                      to="/app/history"
                      state={{ patient_id: assignment.patient_id }}
                      className="btn"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #c7d2fe',
                        color: '#4338ca',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem'
                      }}
                    >
                      <FileText size={16} />
                      View Full History of Vitals & Personal Info
                    </Link>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(assignment.id)}
                            disabled={processingId === assignment.id}
                            className="btn"
                            style={{
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.6rem 1.2rem',
                              border: 'none',
                              borderRadius: '4px'
                            }}
                          >
                            <Check size={16} />
                            {processingId === assignment.id ? 'Acknowledging...' : 'Acknowledge Dispatch'}
                          </button>

                          <button
                            onClick={() => handleDecline(assignment.id)}
                            disabled={processingId === assignment.id}
                            className="btn"
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#b91c1c',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.6rem 1rem',
                              border: '1px solid #fca5a5',
                              borderRadius: '4px'
                            }}
                            title="Pass this emergency dispatch immediately to another available clinician"
                          >
                            <XCircle size={16} color="#dc2626" />
                            Decline / Pass to Next Doctor
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setActivePrescriptionAssignment(assignment)}
                        className="btn btn-primary"
                        style={{
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.6rem 1.25rem',
                          borderRadius: '4px'
                        }}
                      >
                        <Pill size={16} />
                        Suggest Immediate Steps & Medications
                        <ChevronRight size={14} />
                      </button>

                      {!isPending && (
                        <button
                          onClick={() => handleResolve(assignment.id)}
                          disabled={processingId === assignment.id}
                          className="btn"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#059669',
                            fontWeight: 700,
                            border: '1px solid #cbd5e1',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '4px'
                          }}
                        >
                          Mark Stabilized
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: INPATIENT TELEMETRY CARE SCHEDULE (SPECIFIC TO ASSIGNED PATIENT) */}
      <div>
        {assignments.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
              Telemetry Records For Assigned Patient:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {assignments.map((a) => {
                const isSelected = selectedPatientId === a.patient_id;
                return (
                  <button
                    key={a.patient_id}
                    onClick={() => setSelectedPatientId(a.patient_id)}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 800 : 600,
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: isSelected ? '#4338ca' : '#cbd5e1',
                      backgroundColor: isSelected ? '#4338ca' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>{a.patient_name}</span>
                    <span style={{
                      fontSize: '0.7rem',
                      opacity: 0.9,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9'
                    }}>
                      Room {a.room_number || 'N/A'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <CareSchedule
          assessments={patientAssessments}
          patientName={selectedAssignment?.patient_name}
          roomNumber={selectedAssignment?.room_number}
          patientMrn={selectedAssignment?.patient_mrn}
          title={selectedAssignment ? `Telemetry & Assessment History: ${selectedAssignment.patient_name}` : 'Telemetry & Assessment History'}
          emptyMessage={
            assignments.length === 0
              ? "No active emergency patients currently assigned to you. Assessment history will appear here when a patient is assigned to your workstation."
              : `No prior telemetry records found for ${selectedAssignment?.patient_name || 'this patient'}.`
          }
        />
      </div>

      {/* Prescription Modal */}
      {activePrescriptionAssignment && (
        <PrescriptionModal
          patientId={activePrescriptionAssignment.patient_id}
          patientName={activePrescriptionAssignment.patient_name || 'Patient'}
          roomNumber={activePrescriptionAssignment.room_number}
          assignmentId={activePrescriptionAssignment.id}
          onClose={() => setActivePrescriptionAssignment(null)}
          onSuccess={() => {
            setActivePrescriptionAssignment(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
