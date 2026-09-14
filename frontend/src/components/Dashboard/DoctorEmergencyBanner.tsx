import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Heart, Activity, Thermometer, Wind, Check, Pill, CheckCircle2, ChevronRight } from 'lucide-react';
import { acknowledgeAssignment, resolveAssignment, type DoctorAssignment } from '../../services/api';
import { PrescriptionModal } from './PrescriptionModal';
import { toast } from 'sonner';

interface DoctorEmergencyBannerProps {
  assignments: DoctorAssignment[];
  onRefresh: () => void;
}

export const DoctorEmergencyBanner = ({ assignments, onRefresh }: DoctorEmergencyBannerProps) => {
  const [activePrescriptionAssignment, setActivePrescriptionAssignment] = useState<DoctorAssignment | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  if (!assignments || assignments.length === 0) {
    return null;
  }

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

  const handleResolve = async (id: number) => {
    setProcessingId(id);
    try {
      await resolveAssignment(id);
      toast.success('Case marked as stabilized & resolved');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <AnimatePresence>
        {assignments.map((assignment) => {
          const isPending = assignment.status === 'pending';
          const vitals = assignment.vitals;

          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card"
              style={{
                marginBottom: '1rem',
                border: '2px solid',
                borderColor: isPending ? '#dc2626' : '#f59e0b',
                backgroundColor: isPending ? '#fef2f2' : '#fffbeb',
                padding: '1.5rem',
                boxShadow: isPending ? '0 10px 25px -5px rgba(220, 38, 38, 0.15)' : '0 4px 6px -1px rgba(245, 158, 11, 0.1)'
              }}
            >
              {/* Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isPending ? '#dc2626' : '#f59e0b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: isPending ? 'pulse 2s infinite' : 'none'
                  }}>
                    <ShieldAlert size={22} />
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
                        Dispatched {new Date(assignment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#011e3b' }}>
                      Emergency Patient: {assignment.patient_name} ({assignment.patient_age}y, {assignment.patient_gender})
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    padding: '6px 14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Assigned Room</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4338ca' }}>
                      Room {assignment.room_number || 'N/A'}
                    </div>
                  </div>
                </div>
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
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: vitals.heart_rate > 100 || vitals.heart_rate < 50 ? '#dc2626' : '#011e3b' }}>
                      {vitals.heart_rate} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>bpm</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                      <Activity size={13} color="#4338ca" /> SpO2
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: vitals.spo2 < 92 ? '#dc2626' : '#011e3b' }}>
                      {vitals.spo2} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>%</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                      <Activity size={13} color="#059669" /> Blood Press.
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#011e3b' }}>
                      {vitals.systolic_bp} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>mmHg</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                      <Thermometer size={13} color="#f59e0b" /> Temp
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: vitals.temperature > 38.5 ? '#dc2626' : '#011e3b' }}>
                      {vitals.temperature} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>°C</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                      <Wind size={13} color="#6366f1" /> Resp Rate
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#011e3b' }}>
                      {vitals.respiratory_rate} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/min</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                {isPending && (
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
                    {processingId === assignment.id ? 'Acknowledging...' : 'Acknowledge & Attend Patient'}
                  </button>
                )}

                <button
                  onClick={() => setActivePrescriptionAssignment(assignment)}
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '4px'
                  }}
                >
                  <Pill size={16} />
                  Assign Medications & Suggestions
                  <ChevronRight size={14} />
                </button>

                {!isPending && (
                  <button
                    onClick={() => handleResolve(assignment.id)}
                    disabled={processingId === assignment.id}
                    className="btn"
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#059669',
                      fontWeight: 700,
                      border: '1px solid #cbd5e1',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '4px'
                    }}
                  >
                    Mark Stabilized & Complete
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

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
