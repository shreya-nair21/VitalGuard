import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Activity, RefreshCw, ArrowLeft } from 'lucide-react';

const RiskAssessment = () => {
    const location = useLocation();
    const navigate = useNavigate();

    
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

    const handleReassess = () => {
        // Go back to assessment form to enter new data
        navigate('/assessment');
    };

    // Helper to determine risk visual
    const getRiskColor = (risk: string) => {
        if (!risk) return '#ef4444';
        const r = risk.toLowerCase();
        return (r.includes('high') || r.includes('error') || r.includes('critical')) ? '#ef4444' : '#22c55e';
    };

    const riskColor = result ? getRiskColor(result.risk_level) : '#94a3b8';
    const riskText = result ? result.risk_level.toUpperCase() : 'NO DATA';

    if (!result) {
        return (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2>No Assessment Data Found</h2>
                <p>Please conduct a patient assessment first.</p>
                <button 
                    onClick={() => navigate('/assessment')}
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button 
            onClick={() => navigate('/assessment')} 
            style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} style={{ marginRight: '0.25rem' }} /> Back
          </button>
          <h1 className="page-title">Risk Assessment Result</h1>
          <p style={{ color: '#64748b' }}>Analysis generated via VitalGuard AI Model</p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>Patient ID: {vitals.patient_id}</div>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Assessment ID: {result.id}</div> 
          <button 
            onClick={handleReassess}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            New Assessment
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left Column: Risk Score */}
        <div className="card" style={{ 
            flex: '0 0 350px', 
            textAlign: 'center', 
            borderColor: riskColor, 
            backgroundColor: result?.risk_level === 'Stable' ? '#f0fdf4' : '#fef2f2' 
        }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            border: `8px solid ${riskColor}`, 
            margin: '0 auto 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: riskColor
          }}>
            <ShieldAlert size={40} />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '0.25rem' }}>{riskText}</span>
          </div>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: result?.risk_level === 'Stable' ? '#15803d' : '#991b1b', marginBottom: '1rem' }}>
            {result?.risk_level === 'Stable' ? 'Patient Stable' : 'Critical Warning'}
          </h2>
          <p style={{ color: result?.risk_level === 'Stable' ? '#166534' : '#7f1d1d', marginBottom: '1.5rem' }}>
            {result?.analysis_text || (result?.risk_level === 'Error' ? "An error occurred during AI analysis. Please check clinical telemetry manually." : "Analysis complete based on provided vitals.")}
          </p>

          <div style={{ padding: '0.75rem', backgroundColor: result?.risk_level === 'Stable' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', fontSize: '0.875rem', color: result?.risk_level === 'Stable' ? '#15803d' : '#991b1b' }}>
            <strong>Confidence Score:</strong> {(result.prediction_prob * 100).toFixed(1)}%
          </div>
        </div>

        {/* Right Column: Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Vitals Summary */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Vitals Snapshot</h3>
            <div className="grid grid-cols-4">
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Heart Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: vitals.heart_rate > 100 ? '#ef4444' : 'var(--text-main)' }}>{vitals.heart_rate} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>bpm</span></div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SpO2</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: vitals.spo2 < 94 ? '#ef4444' : 'var(--text-main)' }}>{vitals.spo2} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>%</span></div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BP</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{vitals.systolic_bp}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Systolic</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resp. Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: vitals.respiratory_rate > 20 ? '#f59e0b' : 'var(--text-main)' }}>{vitals.respiratory_rate}</div>
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Model Analysis</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Activity size={16} className="text-primary" />
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Assessment Details</h4>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#475569', paddingLeft: '1.5rem' }}>
                Assessment recorded at {new Date(result.timestamp).toLocaleString()}. 
                {result.risk_level === 'High Risk' 
                    ? " Immediate attention recommended due to elevated risk markers." 
                    : " Vitals are within acceptable stability ranges."}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
               <button 
                  onClick={() => navigate('/history', { state: { patient_id: vitals.patient_id } })}
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
