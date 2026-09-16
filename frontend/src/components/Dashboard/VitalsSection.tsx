import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Heart, Activity, Droplet, Wind, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { AssessmentResponse } from '../../services/api';
import { formatISTTime } from '../../utils/dateUtils';

interface VitalCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: any;
  color: string;
  chartColor: string;
  data: { name: string; value: number }[];
  targetRange: string;
  statusLabel: string;
  statusType: 'optimal' | 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

const statusStyles = {
  optimal: {
    bg: '#ecfdf5',
    text: '#065f46',
    border: '#a7f3d0',
    dot: '#10b981'
  },
  normal: {
    bg: '#f0fdf4',
    text: '#166534',
    border: '#bbf7d0',
    dot: '#22c55e'
  },
  warning: {
    bg: '#fffbeb',
    text: '#92400e',
    border: '#fde68a',
    dot: '#f59e0b'
  },
  critical: {
    bg: '#fef2f2',
    text: '#991b1b',
    border: '#fecaca',
    dot: '#ef4444'
  }
};

const VitalCard = ({
  title,
  value,
  unit,
  icon: Icon,
  color,
  chartColor,
  data,
  targetRange,
  statusLabel,
  statusType,
  trend = 'stable'
}: VitalCardProps) => {
  const status = statusStyles[statusType] || statusStyles.normal;
  const gradientId = `vital-grad-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div 
      className="card" 
      style={{ 
        padding: '1.25rem', 
        position: 'relative', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        backgroundColor: 'var(--surface)'
      }}
    >
      {/* Top row: Icon + Title and Status badge */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ 
              backgroundColor: `${color}14`, 
              padding: '0.55rem', 
              borderRadius: '10px',
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {title}
              </span>
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '2px 8px',
            borderRadius: '999px',
            backgroundColor: status.bg,
            color: status.text,
            border: `1px solid ${status.border}`,
            fontSize: '0.7rem',
            fontWeight: 700
          }}>
            <span style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: status.dot
            }} />
            {statusLabel}
          </div>
        </div>
        
        {/* Value + Target Reference */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', lineHeight: 1 }}>
            {value}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            {unit}
          </span>

          {trend === 'up' && (
            <span style={{ display: 'flex', alignItems: 'center', color: '#dc2626', marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600 }}>
              <ArrowUpRight size={14} /> High
            </span>
          )}
          {trend === 'down' && (
            <span style={{ display: 'flex', alignItems: 'center', color: '#f59e0b', marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600 }}>
              <ArrowDownRight size={14} /> Low
            </span>
          )}
          {trend === 'stable' && (
            <span style={{ display: 'flex', alignItems: 'center', color: '#16a34a', marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600 }}>
              <Minus size={14} /> Stable
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginBottom: '0.75rem' }}>
          Target: {targetRange}
        </div>
      </div>

      {/* Mini Area Sparkline */}
      <div style={{ height: '55px', margin: '0 -0.5rem -0.5rem -0.5rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.35}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{
                      backgroundColor: '#011e3b',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}>
                      {payload[0].value} {unit}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={chartColor} 
              strokeWidth={2.2}
              fillOpacity={1} 
              fill={`url(#${gradientId})`} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface VitalsSectionProps {
  history?: AssessmentResponse[];
  patientCount?: number;
}

export const VitalsSection = ({ history = [] }: VitalsSectionProps) => {
  // Get latest assessment or default baseline
  const latest = history.length > 0 ? history[0] : null;

  // Helper to format history for charts (reverse to have oldest first for left-to-right graph)
  const getChartData = (key: keyof AssessmentResponse, defaultVal: number) => {
    if (history.length === 0) {
      // Create a smooth realistic baseline curve if no assessments recorded yet
      const base = defaultVal;
      return [
        { name: '-30m', value: base - 2 },
        { name: '-20m', value: base + 1 },
        { name: '-15m', value: base - 1 },
        { name: '-10m', value: base + 2 },
        { name: '-5m', value: base },
        { name: 'Now', value: base }
      ];
    }
    const points = history.slice(0, 8).reverse().map(item => ({
      name: formatISTTime(item.timestamp, { hour12: true }),
      value: Number(item[key]) || 0
    }));

    // If only 1 point, add a preceding point so sparkline connects nicely
    if (points.length === 1) {
      return [
        { name: '-10m', value: points[0].value },
        points[0]
      ];
    }
    return points;
  };

  // Heart Rate Status
  const hrVal = latest ? Number(latest.heart_rate) : 74;
  const hrStatus: 'optimal' | 'normal' | 'warning' | 'critical' = 
    hrVal > 120 || hrVal < 45 ? 'critical' :
    hrVal > 100 || hrVal < 55 ? 'warning' : 'optimal';
  const hrTrend = hrVal > 100 ? 'up' : hrVal < 60 ? 'down' : 'stable';

  // Blood Pressure (Systolic) Status
  const bpVal = latest ? Number(latest.systolic_bp) : 118;
  const bpStatus: 'optimal' | 'normal' | 'warning' | 'critical' = 
    bpVal > 160 || bpVal < 85 ? 'critical' :
    bpVal > 130 || bpVal < 95 ? 'warning' : 'optimal';
  const bpTrend = bpVal > 130 ? 'up' : bpVal < 95 ? 'down' : 'stable';

  // SpO2 Status
  const spo2Val = latest ? Number(latest.spo2) : 98;
  const spo2Status: 'optimal' | 'normal' | 'warning' | 'critical' = 
    spo2Val < 90 ? 'critical' :
    spo2Val < 94 ? 'warning' : 'optimal';
  const spo2Trend = spo2Val < 94 ? 'down' : 'stable';

  // Respiratory Rate Status
  const rrVal = latest ? Number(latest.respiratory_rate) : 16;
  const rrStatus: 'optimal' | 'normal' | 'warning' | 'critical' = 
    rrVal > 26 || rrVal < 9 ? 'critical' :
    rrVal > 20 || rrVal < 11 ? 'warning' : 'optimal';
  const rrTrend = rrVal > 20 ? 'up' : rrVal < 12 ? 'down' : 'stable';

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {/* Vitals Section Header Bar */}
      <div style={{
        marginBottom: '0.85rem'
      }}>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)'
        }}>
          Hospital Telemetry Baseline
        </span>
      </div>

      {/* 4 Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.25rem' 
      }}>
        <VitalCard 
          title="Heart Rate" 
          value={hrVal} 
          unit="bpm" 
          icon={Heart} 
          color="#ef4444" 
          chartColor="#ef4444" 
          data={getChartData('heart_rate', 74)}
          targetRange="60 – 100 bpm"
          statusLabel={hrStatus === 'optimal' ? 'Optimal' : hrStatus === 'warning' ? 'Elevated' : 'Critical Alert'}
          statusType={hrStatus}
          trend={hrTrend}
        />
        <VitalCard 
          title="Blood Pressure" 
          value={bpVal} 
          unit="mmHg" 
          icon={Activity} 
          color="#f59e0b" 
          chartColor="#f59e0b" 
          data={getChartData('systolic_bp', 118)}
          targetRange="90 – 120 mmHg (Systolic)"
          statusLabel={bpStatus === 'optimal' ? 'Normal' : bpStatus === 'warning' ? 'Elevated' : 'Critical'}
          statusType={bpStatus}
          trend={bpTrend}
        />
        <VitalCard 
          title="Oxygen Saturation" 
          value={spo2Val} 
          unit="%" 
          icon={Droplet} 
          color="#4338ca" 
          chartColor="#4338ca" 
          data={getChartData('spo2', 98)}
          targetRange="95% – 100% SpO2"
          statusLabel={spo2Status === 'optimal' ? 'Optimal' : spo2Status === 'warning' ? 'Low SpO2' : 'Hypoxia Alert'}
          statusType={spo2Status}
          trend={spo2Trend}
        />
        <VitalCard 
          title="Respiratory Rate" 
          value={rrVal} 
          unit="br/min" 
          icon={Wind} 
          color="#10b981" 
          chartColor="#10b981" 
          data={getChartData('respiratory_rate', 16)}
          targetRange="12 – 20 breaths/min"
          statusLabel={rrStatus === 'optimal' ? 'Optimal' : rrStatus === 'warning' ? 'Irregular' : 'Tachypnea'}
          statusType={rrStatus}
          trend={rrTrend}
        />
      </div>
    </div>
  );
};
