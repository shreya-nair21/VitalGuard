import React from 'react';

export type RiskTier = 'stable' | 'moderate' | 'high' | 'critical';

export interface RiskConfig {
  tier: RiskTier;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  lightBg: string;
  textColor: string;
}

export const getRiskConfig = (probability?: number | null, riskLevel?: string | null): RiskConfig => {
  let prob: number | null = null;
  if (typeof probability === 'number' && !isNaN(probability)) {
    prob = probability > 1 ? probability / 100 : probability;
  }

  const r = (riskLevel || '').toLowerCase();

  // 1. Red - Critical (prob >= 0.75 or explicit 'critical'/'error')
  if (r.includes('critical') || r.includes('error') || (prob !== null && prob >= 0.75)) {
    return {
      tier: 'critical',
      label: 'Critical',
      color: '#ef4444', // Red
      bgColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.4)',
      badgeBg: '#ef4444',
      lightBg: 'rgba(254, 226, 226, 0.35)',
      textColor: '#dc2626'
    };
  }

  // 2. Orange - High Risk (0.50 <= prob < 0.75 or 'high')
  if (r.includes('high') || (prob !== null && prob >= 0.50)) {
    return {
      tier: 'high',
      label: 'High Risk',
      color: '#f97316', // Orange
      bgColor: 'rgba(249, 115, 22, 0.15)',
      borderColor: 'rgba(249, 115, 22, 0.4)',
      badgeBg: '#f97316',
      lightBg: 'rgba(255, 237, 213, 0.35)',
      textColor: '#ea580c'
    };
  }

  // 3. Yellow - Moderate (0.25 <= prob < 0.50 or 'moderate')
  if (r.includes('moderate') || (prob !== null && prob >= 0.25)) {
    return {
      tier: 'moderate',
      label: 'Moderate',
      color: '#eab308', // Yellow
      bgColor: 'rgba(234, 179, 8, 0.15)',
      borderColor: 'rgba(234, 179, 8, 0.4)',
      badgeBg: '#eab308',
      lightBg: 'rgba(254, 249, 195, 0.35)',
      textColor: '#ca8a04'
    };
  }

  // 4. Green - Stable (prob < 0.25 or 'stable' / default)
  return {
    tier: 'stable',
    label: 'Stable',
    color: '#22c55e', // Green
    bgColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    badgeBg: '#22c55e',
    lightBg: 'rgba(220, 252, 231, 0.35)',
    textColor: '#16a34a'
  };
};

export const RiskBadge: React.FC<{
  probability?: number | null;
  riskLevel?: string | null;
  showDot?: boolean;
  style?: React.CSSProperties;
}> = ({ probability, riskLevel, showDot = true, style }) => {
  const config = getRiskConfig(probability, riskLevel);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.3px',
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        ...style
      }}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: config.color,
            boxShadow: `0 0 6px ${config.color}`
          }}
        />
      )}
      {config.label}
    </span>
  );
};
