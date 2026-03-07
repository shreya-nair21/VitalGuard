import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPatientHistory, type AssessmentResponse } from '../services/api';
import { VitalsSection } from '../components/Dashboard/VitalsSection';
import { CareSchedule } from '../components/Dashboard/CareSchedule';
import { BodyMap } from '../components/Dashboard/BodyMap';
import { OnlineConsultation, MedicationList } from '../components/Dashboard/SideWidgets';

const Dashboard = () => {
  const { user } = useAuth();
  const [latestAssessment, setLatestAssessment] = useState<AssessmentResponse | null>(null);
  const [recentAssessments, setRecentAssessments] = useState<AssessmentResponse[]>([]);

  useEffect(() => {
    // Fetch latest assessment for demo patient (ID: 1)
    const fetchLatest = async () => {
      try {
        const history = await getPatientHistory(1);
        if (history && history.length > 0) {
          // Sort by timestamp desc to get the newest
          const sorted = history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLatestAssessment(sorted[0]);
          setRecentAssessments(sorted.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard assessment", err);
      }
    };
    fetchLatest();
  }, []);
  
  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <div>
          <h1 style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            Hi {user?.name || 'Doctor'}!<br />
            <span style={{ color: 'var(--text-muted)' }}>How are you feeling today?</span>
          </h1>
        </div>
      </div>

      {latestAssessment && (
        <div className="card" style={{ 
          marginBottom: '2rem', 
          backgroundColor: latestAssessment.risk_level === 'High Risk' ? 'rgba(254, 226, 226, 0.3)' : 'rgba(220, 252, 231, 0.3)', // Semi-transparent for dark mode compat
          borderColor: latestAssessment.risk_level === 'High Risk' ? '#fecaca' : '#bbf7d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '50%', 
                    backgroundColor: latestAssessment.risk_level === 'High Risk' ? '#fee2e2' : '#dcfce7',
                    color: latestAssessment.risk_level === 'High Risk' ? '#991b1b' : '#166534'
                }}>
                    {latestAssessment.risk_level === 'High Risk' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: latestAssessment.risk_level === 'High Risk' ? '#ef4444' : '#22c55e' }}>
                        Latest Analysis: {latestAssessment.risk_level}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>
                        {latestAssessment.analysis_text || "Assessment complete."}
                    </p>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    {new Date(latestAssessment.timestamp).toLocaleString()}
                </div>
                <Link to="/app/risk-assessment" state={{ result: latestAssessment, vitals: latestAssessment }} style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '0.875rem' }}>
                    View Full Report →
                </Link>
            </div>
        </div>
      )}

      <VitalsSection history={recentAssessments} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Col: Schedule & Consultations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <CareSchedule assessments={recentAssessments} />
          <OnlineConsultation />
        </div>

        {/* Middle Col: Body Map */}
        <div className="card" style={{ height: '100%', minHeight: '600px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BodyMap />
        </div>

        {/* Right Col: Medications & Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <MedicationList />
             
             {/* Additional Widget from reference (Analysis) */}
             {/* <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Chest X-ray Analysis</h3>
                    <Link to="/app/assessment" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>New Assessment</Link>
                </div>
                ...
             </div> */}
             <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Quick Actions</h3>
                </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Link to="/app/assessment" className="btn btn-primary" style={{ fontSize: '0.875rem', justifyContent: 'center' }}>New Assessment</Link>
                    <Link to="/app/patients" className="btn" style={{ fontSize: '0.875rem', justifyContent: 'center', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>View All Patients</Link>
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

