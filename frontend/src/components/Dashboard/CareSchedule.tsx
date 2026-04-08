import { Activity, AlertTriangle } from 'lucide-react';
import type { AssessmentResponse } from '../../services/api';

interface RecentActivityProps {
  assessments?: AssessmentResponse[];
}

export const CareSchedule = ({ assessments = [] }: RecentActivityProps) => {
  return (
    <div className="card" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Recent Assessment</h3>

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

        {assessments.slice(0, 4).map((item, index) => {
           const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
           const isRisk = item.risk_level === 'High Risk';
           
           return (
          <div key={item.id || index} style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', position: 'relative' }}>
            <span style={{ width: '50px', fontSize: '0.875rem', color: 'var(--text-muted)', paddingTop: '0.25rem' }}>{time}</span>
            
            <div style={{ 
              flex: 1, 
              padding: '1rem', 
              backgroundColor: isRisk ? '#fef2f2' : 'var(--background)',
              borderRadius: '16px',
              border: isRisk ? '1px solid #fecaca' : 'none',
              boxShadow: index === 0 ? 'var(--shadow)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem', color: isRisk ? '#ef4444' : 'var(--text-main)' }}>
                      {isRisk ? 'Risk Alert' : 'Vitals Check'}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {item.analysis_text ? item.analysis_text.substring(0, 60) + '...' : `HR: ${item.heart_rate} | SpO2: ${item.spo2}%`}
                  </p>
                </div>
                {isRisk ? <AlertTriangle size={16} color="#ef4444" /> : <Activity size={16} color="#0ea5e9" />}
              </div>
            </div>

            {/* Timeline Dot */}
            <div style={{ 
               position: 'absolute', 
               left: '60px', 
               top: '16px', 
               width: '10px', 
               height: '10px', 
               borderRadius: '50%', 
               backgroundColor: isRisk ? '#ef4444' : 'var(--background)',
               border: `2px solid ${isRisk ? '#ef4444' : 'var(--border)'}`,
               zIndex: 2
            }} />
          </div>
        )})}
        
        {assessments.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No recent assessments found.
            </div>
        )}
      </div>
    </div>
  );
};
