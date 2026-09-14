import { Activity, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { AssessmentResponse } from '../../services/api';
import { getRiskConfig, RiskBadge } from '../../utils/riskBadge';

interface RecentActivityProps {
  assessments?: AssessmentResponse[];
  patientName?: string;
  roomNumber?: string;
  patientMrn?: string;
  title?: string;
  emptyMessage?: string;
}

export const CareSchedule = ({
  assessments = [],
  patientName,
  roomNumber,
  patientMrn,
  title,
  emptyMessage
}: RecentActivityProps) => {
  return (
    <div className="card" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#011e3b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={18} color="#4338ca" />
            {title || (patientName ? `Telemetry & Assessment History: ${patientName}` : 'Recent Hospital Assessments')}
          </h3>
          {patientName && (
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Vitals telemetry logs specifically for <strong>{patientName}</strong> {roomNumber ? `• Room ${roomNumber}` : ''} {patientMrn ? `• MRN: ${patientMrn}` : ''}
            </p>
          )}
        </div>
        {roomNumber && (
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '4px',
            backgroundColor: '#eef2ff',
            color: '#4338ca',
            border: '1px solid #c7d2fe'
          }}>
            Room {roomNumber}
          </span>
        )}
      </div>

      <div style={{ position: 'relative', paddingLeft: '1rem' }}>
        {/* Timeline Line */}
        <div style={{ 
          position: 'absolute', 
          left: '74px', 
          top: '0', 
          bottom: '0', 
          width: '2px', 
          backgroundColor: 'var(--border)', 
          borderLeft: '2px dashed var(--border)', 
        }}></div>

        {assessments.slice(0, 6).map((item, index) => {
           const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
           const config = getRiskConfig(item.prediction_prob, item.risk_level);
           
           return (
          <div key={item.id || index} style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', position: 'relative' }}>
            <span style={{ width: '50px', fontSize: '0.85rem', color: 'var(--text-muted)', paddingTop: '0.25rem', fontWeight: 600 }}>{time}</span>
            
            <div style={{ 
              flex: 1, 
              padding: '1rem', 
              backgroundColor: config.lightBg,
              borderRadius: '12px',
              border: `1px solid ${config.borderColor}`,
              boxShadow: index === 0 ? 'var(--shadow-sm)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: config.color }}>
                        {config.label} Observation
                    </h4>
                    <RiskBadge 
                      probability={item.prediction_prob} 
                      riskLevel={item.risk_level} 
                      showDot={false}
                      style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#011e3b', fontWeight: 600, display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span>HR: <strong>{item.heart_rate} bpm</strong></span>
                    <span>SpO2: <strong style={{ color: item.spo2 < 92 ? '#dc2626' : 'inherit' }}>{item.spo2}%</strong></span>
                    <span>BP: <strong>{item.systolic_bp} mmHg</strong></span>
                    <span>Temp: <strong>{item.temperature}°C</strong></span>
                    <span>RR: <strong>{item.respiratory_rate}/min</strong></span>
                  </div>
                  {item.analysis_text && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0.25rem 0 0', fontStyle: 'italic' }}>
                      "{item.analysis_text}"
                    </p>
                  )}
                </div>
                {config.tier === 'critical' ? (
                  <ShieldAlert size={20} color={config.color} />
                ) : config.tier === 'high' ? (
                  <AlertTriangle size={20} color={config.color} />
                ) : (
                  <Activity size={20} color={config.color} />
                )}
              </div>
            </div>

            {/* Timeline Dot */}
            <div style={{ 
               position: 'absolute', 
               left: '60px', 
               top: '16px', 
               width: '12px', 
               height: '12px', 
               borderRadius: '50%', 
               backgroundColor: config.color,
               border: '3px solid var(--background)',
               boxShadow: `0 0 0 1px ${config.color}`,
               zIndex: 2
            }} />
          </div>
        )})}
        
        {assessments.length === 0 && (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {emptyMessage || (patientName ? `No prior telemetry assessments recorded for ${patientName}.` : 'No recent assessments found.')}
            </div>
        )}
      </div>
    </div>
  );
};
