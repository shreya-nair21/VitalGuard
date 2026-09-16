import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getRecentAssessments,
  getPatientHistory,
  getDoctorAssignments,
  getDoctorAvailability,
  updateDoctorAvailability,
  getAdminEmergencyTriage,
  getDashboardStats,
  type AssessmentResponse,
  type DoctorAssignment,
  type AdminEmergencyTriageData,
  type DashboardStats
} from '../services/api';
import { VitalsSection } from '../components/Dashboard/VitalsSection';
import { AdminEmergencyTriage } from '../components/Dashboard/AdminEmergencyTriage';
import { DoctorWorkstation } from '../components/Dashboard/DoctorWorkstation';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  BedDouble, 
  PlusCircle, 
  Settings, 
  ArrowRight
} from 'lucide-react';
import { formatISTHeaderDate, getISTHour } from '../utils/dateUtils';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useAuth();
  const [recentAssessments, setRecentAssessments] = useState<AssessmentResponse[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

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
      // 1. Fetch recent assessments across the hospital
      const recent = await getRecentAssessments(15);
      if (recent && recent.length > 0) {
        setRecentAssessments(recent);
      } else {
        // Fallback to patient 1 if general query returns empty
        const history = await getPatientHistory(1);
        if (history && history.length > 0) {
          const sorted = history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setRecentAssessments(sorted.slice(0, 8));
        }
      }

      // 2. Fetch hospital dashboard capacity stats
      const stats = await getDashboardStats();
      if (stats) {
        setDashboardStats(stats);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard telemetry data", err);
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
      if (isAdmin) {
        fetchAdminData();
        fetchPatientData();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isDoctor, isAdmin, fetchDoctorData, fetchAdminData, fetchPatientData]);

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

  // Greeting helper
  const getGreeting = () => {
    const hour = getISTHour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const adminDisplayName = user?.name 
    ? (user.name.toLowerCase() === 'admin' ? 'Administrator' : user.name) 
    : 'Administrator';

  const criticalCount = adminTriageData?.critical_patients?.length ?? dashboardStats?.high_risk_patients ?? 0;
  const totalPatients = dashboardStats?.total_patients ?? 0;
  const stablePatients = dashboardStats?.stable_patients ?? 0;

  // IF USER IS ADMIN: RENDER HOSPITAL-WIDE SUPERVISORY COMMAND CENTER
  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      {/* 1. Executive Greeting Header (Replaces bare "Dashboard" title) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '1.65rem', 
            fontWeight: 800, 
            letterSpacing: '-0.025em', 
            color: 'var(--text-main)', 
            margin: 0 
          }}>
            {getGreeting()}, {adminDisplayName}
          </h1>
        </div>

        {/* Right side controls: Current Date + Quick Assessment CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

          <div style={{
            fontSize: '0.78rem',
            color: '#64748b',
            fontWeight: 600,
            padding: '5px 10px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            {formatISTHeaderDate()}
          </div>

          <Link 
            to="/app/assessment" 
            className="btn btn-primary" 
            style={{ 
              fontSize: '0.82rem', 
              padding: '6px 14px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem' 
            }}
          >
            <PlusCircle size={15} />
            New Assessment
          </Link>
        </div>
      </div>

      {/* 2. Vitals Cards Placed on the VERY TOP */}
      <VitalsSection history={recentAssessments} />

      {/* 3. Emergency Triage & Critical Patient Command Board (Includes Medical Staff Roster) */}
      <AdminEmergencyTriage 
        data={adminTriageData} 
        loading={loadingAdminTriage} 
        onRefresh={fetchAdminData}
      />

      {/* 4. Balanced Lower Command Deck: Facility Capacity & Administrative Actions */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
        gap: '1.5rem', 
        alignItems: 'stretch' 
      }}>
        {/* Left Card: Hospital Ward Capacity & Patient Population */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#011e3b' }}>
                <BedDouble size={18} color="#4338ca" />
                Facility Capacity & Patient Census
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {/* Total Patients */}
              <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Total Admitted
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#011e3b' }}>
                  {totalPatients}
                </div>
              </div>

              {/* Critical Alerts */}
              <div style={{ 
                padding: '0.85rem', 
                backgroundColor: criticalCount > 0 ? '#fef2f2' : '#f8fafc', 
                borderRadius: '8px', 
                border: '1px solid',
                borderColor: criticalCount > 0 ? '#fecaca' : '#e2e8f0' 
              }}>
                <div style={{ fontSize: '0.75rem', color: criticalCount > 0 ? '#991b1b' : '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Critical Triage
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: criticalCount > 0 ? '#dc2626' : '#011e3b' }}>
                  {criticalCount}
                </div>
              </div>

              {/* Stable */}
              <div style={{ padding: '0.85rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Stable Baseline
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>
                  {stablePatients}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <Link 
              to="/app/patients" 
              style={{ 
                fontSize: '0.82rem', 
                color: '#4338ca', 
                fontWeight: 700, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.35rem' 
              }}
            >
              Browse Complete Inpatient Ward Directory <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Right Card: Administrative Quick Actions & Management Shortcuts */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#011e3b' }}>
                <Activity size={18} color="#4338ca" />
                Administrative Command Operations
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <Link 
                to="/app/assessment" 
                className="btn btn-primary" 
                style={{ 
                  fontSize: '0.875rem', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem 1rem' 
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <PlusCircle size={17} />
                  Conduct Patient Telemetry Assessment
                </span>
                <ArrowRight size={16} />
              </Link>

              <Link 
                to="/app/patients" 
                className="btn" 
                style={{ 
                  fontSize: '0.875rem', 
                  justifyContent: 'space-between', 
                  background: 'var(--background)', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-main)', 
                  padding: '0.75rem 1rem' 
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <BedDouble size={17} color="#4338ca" />
                  View All Patients & Room Allotment
                </span>
                <ArrowRight size={16} />
              </Link>

              <Link 
                to="/app/settings" 
                className="btn" 
                style={{ 
                  fontSize: '0.875rem', 
                  justifyContent: 'space-between', 
                  background: 'var(--background)', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-main)', 
                  padding: '0.75rem 1rem' 
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Settings size={17} color="#4338ca" />
                  Manage Doctors, Clinicians & Staff Accounts
                </span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

