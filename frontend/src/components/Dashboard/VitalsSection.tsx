import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Activity, Droplet, Wind } from 'lucide-react';
import type { AssessmentResponse } from '../../services/api';

const VitalCard = ({ title, value, unit, icon: Icon, color, chartColor, data }: any) => {
  return (
    <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            backgroundColor: `${color}15`, // very light bg
            padding: '0.625rem', 
            borderRadius: '12px',
            color: color 
          }}>
            <Icon size={20} />
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{title}</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{value}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{unit}</span>
      </div>

      <div style={{ height: '60px', marginTop: '0.5rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip cursor={false} content={<></>} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={chartColor} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#gradient-${title.replace(/\s/g, '')})`} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface VitalsSectionProps {
    history?: AssessmentResponse[];
}

export const VitalsSection = ({ history = [] }: VitalsSectionProps) => {
  // Get latest assessment or default values
  const latest = history.length > 0 ? history[0] : null;

  // Helper to format history for charts (reverse to have oldest first for left-to-right graph)
  const getChartData = (key: keyof AssessmentResponse) => {
      return history.slice(0, 7).reverse().map(item => ({
          name: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: Number(item[key]) || 0
      }));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
       <VitalCard 
         title="Heart Rate" 
         value={latest ? latest.heart_rate : '--'} 
         unit="bpm" 
         icon={Activity} 
         color="#ef4444" 
         chartColor="#ef4444" 
         data={getChartData('heart_rate')}
       />
       <VitalCard 
         title="Blood Pressure" 
         value={latest ? latest.systolic_bp : '--'} 
         unit="mmHg" 
         icon={Activity} 
         color="#f59e0b" 
         chartColor="#f59e0b" 
         data={getChartData('systolic_bp')}
       />
       <VitalCard 
         title="SpO2 Level" 
         value={latest ? latest.spo2 : '--'} 
         unit="%" 
         icon={Droplet} 
         color="#4338ca" 
         chartColor="#4338ca" 
         data={getChartData('spo2')}
       />
       <VitalCard 
         title="Resp. Rate" 
         value={latest ? latest.respiratory_rate : '--'} 
         unit="br/min" 
         icon={Wind} 
         color="#22c55e" 
         chartColor="#22c55e" 
         data={getChartData('respiratory_rate')}
       />
    </div>
  );
};
