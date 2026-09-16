import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Activity, RefreshCw, ArrowLeft, Download, User, Bed, Clock } from 'lucide-react';
import { getRiskConfig, RiskBadge } from '../utils/riskBadge';
import { generateClinicalPdfReport } from '../utils/pdfGenerator';
import { getPatients, type Patient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { formatClinicianName } from '../utils/formatDoctorName';
import { formatISTDateTime } from '../utils/dateUtils';

const RiskAssessment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const clinicianName = user?.name ? formatClinicianName(user.name) : 'Dr. Attending Physician';

    // Get initial state from navigation or use defaults
    const initialState = location.state || {};
    const [result] = useState(initialState.result || null);
    const [vitals] = useState<any>(initialState.vitals || {
        heart_rate: 0,
        spo2: 0,
        systolic_bp: 0,
        respiratory_rate: 0,
        temperature: 0,
        consciousness: 'Alert'
    });

    const [patient, setPatient] = useState<Patient | null>(initialState.patient || null);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    useEffect(() => {
        if (!patient && (vitals?.patient_id || result?.patient_id)) {
            const targetId = Number(vitals?.patient_id || result?.patient_id);
            getPatients().then(list => {
                const found = list.find(p => p.id === targetId);
                if (found) setPatient(found);
            }).catch(console.error);
        }
    }, [patient, vitals?.patient_id, result?.patient_id]);

    const handleReassess = () => {
        navigate('/app/assessment');
    };

    const handleDownloadPdf = () => {
        if (!result) return;
        try {
            setIsDownloadingPdf(true);
            const filename = generateClinicalPdfReport({
                result,
                vitals,
                patient,
                clinicianName
            });
            toast.success('Clinical PDF Report Downloaded', {
                description: `Saved as ${filename}`,
                duration: 5000
            });
        } catch (err: any) {
            console.error('PDF generation error:', err);
            toast.error('Failed to generate PDF report', {
                description: err.message || 'An unexpected error occurred.'
            });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const riskConfig = getRiskConfig(result?.prediction_prob, result?.risk_level);
    const riskText = riskConfig.label.toUpperCase();

    if (!result) {
        return (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2>No Assessment Data Found</h2>
                <p>Please conduct a patient assessment first.</p>
                <button 
                    onClick={() => navigate('/app/assessment')}
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                >
                    Start Assessment
                </button>
            </div>
        );
    }

  return (
    <div>
      {/* Print Styles for Professional A4 Output */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: #0f172a !important;
            font-size: 12pt !important;
          }
          .no-print, header, nav, .sidebar, button, .navbar {
            display: none !important;
          }
          .card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            page-break-inside: avoid;
          }
          .page-header {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 1rem !important;
            margin-bottom: 1.5rem !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button 
            onClick={() => navigate('/app/assessment')} 
            className="no-print"
            style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
          >
            <ArrowLeft size={16} style={{ marginRight: '0.25rem' }} /> Back to Assessments
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>Risk Assessment Result</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Clinical analysis generated via VitalGuard AI Telemetry Engine
          </p>
        </div>

        {/* Action Buttons */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              Patient #{patient?.id || vitals.patient_id}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Report ID: VG-RPT-{result.id}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button 
              id="download-pdf-button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.2rem',
                backgroundColor: '#4338ca',
                color: 'white',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 2px 6px rgba(67, 56, 202, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              <Download size={16} />
              {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>

            <button 
              onClick={handleReassess}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.1rem',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              <RefreshCw size={16} />
              New Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Patient Overview Bar */}
      <div className="card" style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem 1.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem',
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="#4338ca" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient Name</div>
              <strong style={{ fontSize: '0.95rem' }}>{patient?.name || `Patient #${vitals.patient_id}`}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bed size={18} color="#4338ca" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Allotted Room</div>
              <span style={{ 
                padding: '0.2rem 0.6rem', 
                backgroundColor: 'rgba(67, 56, 202, 0.08)', 
                color: '#4338ca', 
                borderRadius: '999px', 
                fontWeight: 700, 
                fontSize: '0.8rem',
                border: '1px solid rgba(67, 56, 202, 0.18)'
              }}>
                Room {patient?.room_number || 'N/A'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Demographics</div>
            <strong style={{ fontSize: '0.9rem' }}>
              {patient?.age ? `${patient.age} yrs` : 'N/A'} / {patient?.gender || 'N/A'}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
              <Clock size={13} /> Recorded Timestamp (IST)
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {formatISTDateTime(result.timestamp)}
            </div>
          </div>
          <RiskBadge probability={result.prediction_prob} riskLevel={result.risk_level} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {/* Left Column: Risk Score & PDF Export Panel */}
        <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Risk Score Card */}
          <div className="card" style={{ 
              textAlign: 'center', 
              borderColor: riskConfig.borderColor, 
              backgroundColor: riskConfig.lightBg 
          }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              border: `8px solid ${riskConfig.color}`, 
              margin: '0 auto 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: riskConfig.color,
              boxShadow: `0 0 20px ${riskConfig.bgColor}`
            }}>
              <ShieldAlert size={40} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '0.25rem' }}>{riskText}</span>
            </div>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: riskConfig.color, marginBottom: '0.75rem' }}>
              {riskConfig.tier === 'critical' ? 'Critical Alert' : 
               riskConfig.tier === 'high' ? 'High Risk Warning' : 
               riskConfig.tier === 'moderate' ? 'Moderate Concern' : 'Patient Stable'}
            </h2>
            <p style={{ color: 'var(--text-main)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {result?.analysis_text || (result?.risk_level === 'Error' ? "An error occurred during AI analysis. Please check clinical telemetry manually." : "Analysis complete based on provided vitals.")}
            </p>

            <div style={{ 
              padding: '0.75rem 1rem', 
              backgroundColor: riskConfig.bgColor, 
              border: `1px solid ${riskConfig.borderColor}`,
              borderRadius: '0.5rem', 
              fontSize: '0.875rem', 
              color: riskConfig.textColor,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span><strong>Confidence Score:</strong> {(result.prediction_prob * 100).toFixed(1)}%</span>
              <RiskBadge probability={result.prediction_prob} riskLevel={result.risk_level} />
            </div>
          </div>
        </div>

        {/* Right Column: Vitals Snapshot & AI Model Details */}
        <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Vitals Summary */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Vitals Snapshot</h3>
            <div className="grid grid-cols-4">
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Heart Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: vitals.heart_rate > 100 || vitals.heart_rate < 50 ? '#ef4444' : 'var(--text-main)' }}>
                  {vitals.heart_rate} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>bpm</span>
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SpO2</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: vitals.spo2 < 94 ? '#ef4444' : 'var(--text-main)' }}>
                  {vitals.spo2} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>%</span>
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BP Systolic</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: vitals.systolic_bp < 90 || vitals.systolic_bp > 140 ? '#f97316' : 'var(--text-main)' }}>
                  {vitals.systolic_bp} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>mmHg</span>
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resp. Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: vitals.respiratory_rate > 20 || vitals.respiratory_rate < 12 ? '#f59e0b' : 'var(--text-main)' }}>
                  {vitals.respiratory_rate} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/min</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, padding: '0.75rem 1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temperature</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{vitals.temperature || 37.0} °C</div>
              </div>
              <div style={{ flex: 1, padding: '0.75rem 1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Consciousness (AVPU)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{vitals.consciousness || 'Alert'}</div>
              </div>
            </div>
          </div>

          {/* AI Explanation & Protocol Guidance */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Model Analysis & Recommendations</h3>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Activity size={16} className="text-primary" />
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Assessment Summary</h4>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.5rem', margin: 0, lineHeight: 1.5 }}>
                Assessment recorded at {formatISTDateTime(result.timestamp)}. 
                {riskConfig.tier === 'critical' 
                    ? " Critical urgency: Immediate medical intervention required due to severe deterioration markers." 
                    : riskConfig.tier === 'high'
                    ? " High risk: Close telemetry monitoring and urgent clinical review recommended."
                    : riskConfig.tier === 'moderate'
                    ? " Moderate risk: Follow up monitoring and vitals re-check suggested."
                    : " Patient vitals are within acceptable stability ranges."}
              </p>
            </div>

            <div style={{ 
              padding: '1rem', 
              backgroundColor: riskConfig.bgColor, 
              border: `1px solid ${riskConfig.borderColor}`, 
              borderRadius: '0.5rem' 
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, color: riskConfig.color }}>
                {riskConfig.tier === 'critical' ? 'IMMEDIATE CLINICAL ACTION REQUIRED' :
                 riskConfig.tier === 'high' ? 'CLINICAL ESCALATION PROTOCOL' :
                 riskConfig.tier === 'moderate' ? 'OBSERVATION PROTOCOL' : 'STANDARD CARE PLAN'}
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                {riskConfig.tier === 'critical' ? (
                  <>
                    <li>Activate Rapid Response Team (RRT) or notify on-duty intensivist immediately.</li>
                    <li>Titrate high-flow oxygen via reservoir mask to achieve SpO2 &ge; 94%.</li>
                    <li>Establish two large-bore IV access points and prepare for emergency stabilization.</li>
                    <li>Prepare patient transfer to Intensive Care Unit (ICU).</li>
                  </>
                ) : riskConfig.tier === 'high' ? (
                  <>
                    <li>Alert attending physician for urgent bedside evaluation within 30 minutes.</li>
                    <li>Place patient on continuous pulse oximetry and automated BP recording every 15 mins.</li>
                    <li>Order stat arterial blood gas (ABG) and standard metabolic panel.</li>
                  </>
                ) : riskConfig.tier === 'moderate' ? (
                  <>
                    <li>Increase nursing vitals check frequency to every 1 to 2 hours.</li>
                    <li>Repeat full clinical risk assessment in 60 minutes.</li>
                  </>
                ) : (
                  <>
                    <li>Continue routine inpatient nursing observations every 4 to 6 hours.</li>
                    <li>Maintain standard recovery care plan and medication schedule.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => navigate('/app/history', { state: { patient_id: vitals.patient_id } })}
              className="btn"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
            >
              View Patient History
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RiskAssessment;
