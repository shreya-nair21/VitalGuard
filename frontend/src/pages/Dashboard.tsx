import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getPatientHistory,
  getDoctorAssignments,
  getDoctorAvailability,
  updateDoctorAvailability,
  getAdminEmergencyTriage,
  type AssessmentResponse,
  type DoctorAssignment,
  type AdminEmergencyTriageData
} from '../services/api';
import { VitalsSection } from '../components/Dashboard/VitalsSection';
import { CareSchedule } from '../components/Dashboard/CareSchedule';
import { OnlineConsultation, MedicationList } from '../components/Dashboard/SideWidgets';
import { AdminEmergencyTriage } from '../components/Dashboard/AdminEmergencyTriage';
import { DoctorWorkstation } from '../components/Dashboard/DoctorWorkstation';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useAuth();
  const [recentAssessments, setRecentAssessments] = useState<AssessmentResponse[]>([]);

  // Doctor-specific state
  const [doctorAssignments, setDoctorAssignments] = useState<DoctorAssignment[]>([]);
  const [doctorAvailability, setDoctorAvailability] = useState<'available' | 'busy' | 'off_duty'>('available');

  // Admin-specific state
  const [adminTriageData, setAdminTriageData] = useState<AdminEmergencyTriageData | null>(null);
  const [loadingAdminTriage, setLoadingAdminTriage] = useState(false);

  const role = user?.role?.toLowerCase() || 'doctor';
  const isDoctor = role === 'doctor';
  const isAdmin = role === 'admin';

  // Fetch patient telemetry history for hospital overview (Admin only)
  const fetchPatientData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const history = await getPatientHistory(1);
      if (history && history.length > 0) {
        const sorted = history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentAssessments(sorted.slice(0, 5));
      }
    } catch (err) {
      console.error("Failed to fetch dashboard assessment", err);
    }
  }, [isAdmin]);

  // Fetch doctor data (assignments + availability)
  const fetchDoctorData = useCallback(async () => {
    if (!isDoctor) return;
    try {
      const [assignments, availData] = await Promise.all([
        getDoctorAssignments(),
        getDoctorAvailability()
      ]);
      setDoctorAssignments(assignments);
      if (availData?.availability) {
        setDoctorAvailability(availData.availability as any);
      }
    } catch (err) {
      console.error("Failed to fetch doctor live triage data", err);
    }
  }, [isDoctor]);

  // Fetch admin triage data
  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getAdminEmergencyTriage();
      setAdminTriageData(data);
    } catch (err) {
      console.error("Failed to fetch admin emergency triage", err);
    }
  }, [isAdmin]);

  // Initial load
  useEffect(() => {
    fetchPatientData();
    if (isDoctor) fetchDoctorData();
    if (isAdmin) {
      setLoadingAdminTriage(true);
      fetchAdminData().finally(() => setLoadingAdminTriage(false));
    }
  }, [fetchPatientData, fetchDoctorData, fetchAdminData, isDoctor, isAdmin]);

  // Real-Time 4-second lightweight polling hook
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDoctor) fetchDoctorData();
      if (isAdmin) fetchAdminData();
    }, 4000);
    return () => clearInterval(interval);
  }, [isDoctor, isAdmin, fetchDoctorData, fetchAdminData]);

  // Doctor Availability Toggle
  const handleAvailabilityChange = async (newStatus: 'available' | 'busy' | 'off_duty') => {
    try {
      await updateDoctorAvailability(newStatus);
      setDoctorAvailability(newStatus);
      toast.success(`Shift status changed to ${newStatus.replace('_', ' ').toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update availability');
    }
  };

  // IF USER IS DOCTOR: RENDER DEDICATED DOCTOR WORKSTATION
  if (isDoctor) {
    return (
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <DoctorWorkstation
          doctorName={user?.name || 'Doctor'}
          assignments={doctorAssignments}
          availability={doctorAvailability}
          onAvailabilityChange={handleAvailabilityChange}
          onRefresh={fetchDoctorData}
        />
      </div>
    );
  }

  // IF USER IS ADMIN: RENDER HOSPITAL-WIDE SUPERVISORY COMMAND CENTER
  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Admin Command Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#b45309', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
              ADMINISTRATIVE COMMAND CENTER
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Hospital Telemetry & Triage Oversight</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text-main)', margin: '0.25rem 0 0' }}>
            Administrator Dashboard
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Real-time critical patient tracking, doctor assignments status, room allotments, and clinical order verification.
          </p>
        </div>
      </div>

      {/* Admin Emergency Triage & Critical Patient Command Board */}
      <AdminEmergencyTriage 
        data={adminTriageData} 
        loading={loadingAdminTriage} 
        onRefresh={fetchAdminData}
      />

      {/* Hospital Telemetry Overview */}
      <VitalsSection history={recentAssessments} />

      {/* 2-Column Grid for Schedules & Side Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Col: Care Schedule & Online Consultation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <CareSchedule assessments={recentAssessments} />
          <OnlineConsultation />
        </div>

        {/* Right Col: Dynamic Medications & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <MedicationList />
          
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={16} color="#4338ca" />
                Administrative Actions
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/app/assessment" className="btn btn-primary" style={{ fontSize: '0.875rem', justifyContent: 'center' }}>
                Conduct Patient Assessment
              </Link>
              <Link to="/app/patients" className="btn" style={{ fontSize: '0.875rem', justifyContent: 'center', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                View All Patients & Rooms
              </Link>
              <Link to="/app/settings" className="btn" style={{ fontSize: '0.875rem', justifyContent: 'center', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                Manage Doctors & Staff Accounts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
