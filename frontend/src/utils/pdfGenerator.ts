import jsPDF from 'jspdf';
import { getRiskConfig } from './riskBadge';
import { formatISTDate, formatISTTime } from './dateUtils';
import type { AssessmentResponse, Patient } from '../services/api';

export interface VitalsData {
  patient_id?: number;
  heart_rate: number;
  systolic_bp: number;
  spo2: number;
  respiratory_rate: number;
  temperature: number;
  consciousness: string;
}

export interface ReportGenerationParams {
  result: AssessmentResponse;
  vitals: VitalsData;
  patient?: Patient | null;
  clinicianName?: string;
}

export const generateClinicalPdfReport = ({
  result,
  vitals,
  patient,
  clinicianName = 'Dr. Attending'
}: ReportGenerationParams) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const riskConfig = getRiskConfig(result.prediction_prob, result.risk_level);
  const confidencePct = typeof result.prediction_prob === 'number'
    ? (result.prediction_prob > 1 ? result.prediction_prob : result.prediction_prob * 100).toFixed(1)
    : 'N/A';

  const formattedDate = formatISTDate(result.timestamp || Date.now());
  const formattedTime = formatISTTime(result.timestamp || Date.now(), { includeZone: true });

  // Color definitions (RGB)
  const navyDark: [number, number, number] = [15, 23, 42]; // #0f172a
  const slateGray: [number, number, number] = [100, 116, 139]; // #64748b
  const lightBg: [number, number, number] = [248, 250, 252]; // #f8fafc
  const cardBorder: [number, number, number] = [226, 232, 240]; // #e2e8f0

  let bannerBg: [number, number, number];
  let bannerText: [number, number, number] = [255, 255, 255];
  let bannerTitle: string;
  let bannerSubtitle: string;

  if (riskConfig.tier === 'critical') {
    bannerBg = [220, 38, 38]; // Red #dc2626
    bannerTitle = 'CRITICAL ALERT - IMMEDIATE INTERVENTION REQUIRED';
    bannerSubtitle = 'Patient telemetry indicates severe clinical deterioration. High priority escalation needed.';
  } else if (riskConfig.tier === 'high') {
    bannerBg = [234, 88, 12]; // Orange #ea580c
    bannerTitle = 'HIGH RISK WARNING - URGENT REVIEW RECOMMENDED';
    bannerSubtitle = 'Significant abnormal vital sign patterns detected. Continuous telemetry advised.';
  } else if (riskConfig.tier === 'moderate') {
    bannerBg = [202, 138, 4]; // Yellow/Amber #ca8a04
    bannerTitle = 'MODERATE RISK - TELEMETRY SURVEILLANCE';
    bannerSubtitle = 'Mild telemetry abnormalities recorded. Scheduled follow-up and monitoring recommended.';
  } else {
    bannerBg = [22, 163, 74]; // Green #16a34a
    bannerTitle = 'STABLE PATIENT - ROUTINE MONITORING';
    bannerSubtitle = 'All recorded vital parameters are within acceptable clinical stability boundaries.';
  }

  // ================= 1. HEADER BANNER =================
  doc.setFillColor(...navyDark);
  doc.rect(0, 0, 210, 26, 'F');

  // Institution title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('VITALGUARD CLINICAL INTELLIGENCE', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text('ACUTE CARE TELEMETRY & CLINICAL DECISION SUPPORT SYSTEM', 14, 17);
  doc.text('ICU & INPATIENT EARLY WARNING MONITORING', 14, 21);

  // Top-Right confidential badge
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(148, 7, 48, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CONFIDENTIAL MEDICAL RECORD', 151, 14.5);

  // ================= 2. REPORT METADATA STRIP =================
  let curY = 32;
  doc.setDrawColor(...cardBorder);
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, curY, 182, 10, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateGray);
  doc.text(`Report ID: VG-RPT-${result.id || 'NEW'}`, 18, curY + 6.5);
  doc.text(`Date: ${formattedDate} ${formattedTime}`, 75, curY + 6.5);
  doc.text(`Assessing Clinician: ${clinicianName}`, 140, curY + 6.5);

  // ================= 3. PATIENT DEMOGRAPHICS CARD =================
  curY = 46;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(14, curY, 182, 22, 2, 2, 'FD');

  // Title for section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...navyDark);
  doc.text('PATIENT DEMOGRAPHICS & CLINICAL LOCATION', 18, curY + 5.5);

  // Horizontal divider inside card
  doc.setDrawColor(241, 245, 249);
  doc.line(18, curY + 7.5, 192, curY + 7.5);

  // Patient data columns
  const pName = patient?.name || 'Patient Record';
  const pId = patient?.id ? `#${patient.id}` : (vitals.patient_id ? `#${vitals.patient_id}` : 'N/A');
  const pRoom = patient?.room_number ? `Room ${patient.room_number}` : 'Unassigned';
  const pAgeGender = `${patient?.age || 'N/A'} yrs / ${patient?.gender === 'M' ? 'Male' : patient?.gender === 'F' ? 'Female' : (patient?.gender || 'N/A')}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateGray);
  doc.text('Patient Name:', 18, curY + 13);
  doc.text('Patient ID:', 75, curY + 13);
  doc.text('Allotted Room:', 120, curY + 13);
  doc.text('Age / Gender:', 160, curY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navyDark);
  doc.text(pName, 18, curY + 18.5);
  doc.text(pId, 75, curY + 18.5);
  doc.setTextColor(14, 165, 233); // Blue for room
  doc.text(pRoom, 120, curY + 18.5);
  doc.setTextColor(...navyDark);
  doc.text(pAgeGender, 160, curY + 18.5);

  // ================= 4. RISK STRATIFICATION BANNER =================
  curY = 72;
  doc.setFillColor(...bannerBg);
  doc.roundedRect(14, curY, 182, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...bannerText);
  doc.text(bannerTitle, 19, curY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(bannerSubtitle, 19, curY + 13);

  // Badge pill inside the banner
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(19, curY + 15, 60, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...bannerBg);
  doc.text(`CONFIDENCE SCORE: ${confidencePct}%`, 22, curY + 18.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`TIER: ${riskConfig.label.toUpperCase()}`, 148, curY + 18.5);

  // ================= 5. CLINICAL TELEMETRY TABLE =================
  curY = 98;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navyDark);
  doc.text('RECORDED CLINICAL VITALS & TELEMETRY MATRIX', 14, curY);

  curY = 102;
  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(...cardBorder);
  doc.rect(14, curY, 182, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navyDark);
  doc.text('VITAL PARAMETER', 18, curY + 5);
  doc.text('RECORDED VALUE', 75, curY + 5);
  doc.text('STANDARD RANGE', 115, curY + 5);
  doc.text('CLINICAL STATUS', 155, curY + 5);

  interface VitalRow {
    param: string;
    value: string;
    range: string;
    status: string;
    isAbnormal: boolean;
    isCritical: boolean;
  }

  const rows: VitalRow[] = [
    {
      param: 'Heart Rate (Pulse)',
      value: `${vitals.heart_rate} bpm`,
      range: '60 - 100 bpm',
      status: vitals.heart_rate > 130 || vitals.heart_rate < 40 ? 'Critical' : (vitals.heart_rate > 100 ? 'Tachycardia' : (vitals.heart_rate < 60 ? 'Bradycardia' : 'Normal')),
      isAbnormal: vitals.heart_rate > 100 || vitals.heart_rate < 60,
      isCritical: vitals.heart_rate > 130 || vitals.heart_rate < 40
    },
    {
      param: 'Systolic Blood Pressure',
      value: `${vitals.systolic_bp} mmHg`,
      range: '90 - 120 mmHg',
      status: vitals.systolic_bp < 80 ? 'Critical Hypotension' : (vitals.systolic_bp < 90 ? 'Hypotension' : (vitals.systolic_bp > 140 ? 'Hypertension' : 'Normal')),
      isAbnormal: vitals.systolic_bp < 90 || vitals.systolic_bp > 140,
      isCritical: vitals.systolic_bp < 80
    },
    {
      param: 'Oxygen Saturation (SpO2)',
      value: `${vitals.spo2} %`,
      range: '95 - 100 %',
      status: vitals.spo2 < 88 ? 'Severe Hypoxia' : (vitals.spo2 < 94 ? 'Hypoxia' : 'Normal'),
      isAbnormal: vitals.spo2 < 94,
      isCritical: vitals.spo2 < 88
    },
    {
      param: 'Respiratory Rate',
      value: `${vitals.respiratory_rate} /min`,
      range: '12 - 20 /min',
      status: vitals.respiratory_rate > 28 || vitals.respiratory_rate < 8 ? 'Critical' : (vitals.respiratory_rate > 20 ? 'Tachypnea' : (vitals.respiratory_rate < 12 ? 'Bradypnea' : 'Normal')),
      isAbnormal: vitals.respiratory_rate > 20 || vitals.respiratory_rate < 12,
      isCritical: vitals.respiratory_rate > 28 || vitals.respiratory_rate < 8
    },
    {
      param: 'Body Temperature',
      value: `${vitals.temperature} °C`,
      range: '36.5 - 37.5 °C',
      status: vitals.temperature > 38.5 ? 'High Fever' : (vitals.temperature > 37.5 ? 'Pyrexia' : (vitals.temperature < 36.0 ? 'Hypothermia' : 'Normal')),
      isAbnormal: vitals.temperature > 37.5 || vitals.temperature < 36.0,
      isCritical: vitals.temperature > 39.0 || vitals.temperature < 35.0
    },
    {
      param: 'Neurological (AVPU)',
      value: vitals.consciousness || 'Alert',
      range: 'Alert',
      status: vitals.consciousness === 'Alert' ? 'Normal' : (vitals.consciousness === 'Confusion' ? 'Altered' : 'Critical Depressed'),
      isAbnormal: vitals.consciousness !== 'Alert',
      isCritical: vitals.consciousness === 'Pain' || vitals.consciousness === 'Unresponsive'
    }
  ];

  curY += 7;
  rows.forEach((row, i) => {
    // Alternating background
    if (i % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, curY, 182, 6.8, 'F');
    }

    doc.setDrawColor(...cardBorder);
    doc.line(14, curY + 6.8, 196, curY + 6.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...navyDark);
    doc.text(row.param, 18, curY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.text(row.value, 75, curY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateGray);
    doc.text(row.range, 115, curY + 4.8);

    // Status pill text
    if (row.isCritical) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`● ${row.status}`, 155, curY + 4.8);
    } else if (row.isAbnormal) {
      doc.setTextColor(234, 88, 12);
      doc.setFont('helvetica', 'bold');
      doc.text(`● ${row.status}`, 155, curY + 4.8);
    } else {
      doc.setTextColor(22, 163, 74);
      doc.setFont('helvetica', 'normal');
      doc.text(`✓ ${row.status}`, 155, curY + 4.8);
    }

    curY += 6.8;
  });

  // Table bounding border
  doc.setDrawColor(...cardBorder);
  doc.rect(14, 102, 182, curY - 102, 'S');

  // ================= 6. AI ANALYSIS & CLINICAL IMPRESSION =================
  curY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navyDark);
  doc.text('AI MODEL FINDINGS & CLINICAL IMPRESSION', 14, curY);

  curY += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(14, curY, 182, 22, 1.5, 1.5, 'FD');

  // Colored left accent bar
  doc.setFillColor(...bannerBg);
  doc.rect(14, curY, 3, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...navyDark);
  doc.text('Clinical Synthesis:', 21, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const analysisLines = doc.splitTextToSize(
    result.analysis_text || (result.risk_level === 'Error'
      ? 'Automated model inference experienced a telemetry exception. Manual clinical verification required.'
      : 'Comprehensive vitals analysis completed. All telemetry markers evaluated against national early warning criteria.'),
    170
  );
  doc.text(analysisLines, 21, curY + 11.5);

  // ================= 7. RECOMMENDED ACTION PROTOCOL =================
  curY += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navyDark);
  doc.text('RECOMMENDED CLINICAL ACTION PROTOCOL', 14, curY);

  curY += 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(14, curY, 182, 26, 1.5, 1.5, 'FD');

  let protocols: string[] = [];
  if (riskConfig.tier === 'critical') {
    protocols = [
      '1. URGENT: Activate Rapid Response Team (RRT) / notify on-duty intensivist immediately.',
      '2. AIRWAY & OXYGEN: Titrate high-flow oxygen via reservoir mask to achieve SpO2 >= 94%.',
      '3. VASCULAR ACCESS & MONITORING: Establish two large-bore IV lines; initiate continuous arterial/cardiac monitoring.',
      '4. ESCALATION: Prepare patient transfer to Intensive Care Unit (ICU) / High Dependency Unit (HDU).'
    ];
  } else if (riskConfig.tier === 'high') {
    protocols = [
      '1. NOTIFICATION: Alert attending physician for bedside clinical evaluation within 30 minutes.',
      '2. TELEMETRY: Place patient on continuous pulse oximetry and automated blood pressure recording every 15 mins.',
      '3. INVESTIGATIONS: Order urgent arterial blood gas (ABG), full blood count, and standard metabolic panel.',
      '4. FLUID BALANCE: Review current fluid administration and hourly urine output charting.'
    ];
  } else if (riskConfig.tier === 'moderate') {
    protocols = [
      '1. OBSERVATION: Increase nursing vitals monitoring frequency to every 1 to 2 hours.',
      '2. RE-ASSESSMENT: Repeat full clinical risk scoring in 60 minutes or upon any physiological change.',
      '3. CLINICAL REVIEW: Check patient response to recent pharmacotherapy and maintain adequate hydration.'
    ];
  } else {
    protocols = [
      '1. ROUTINE CARE: Continue standard inpatient telemetry rounds every 4 to 6 hours.',
      '2. COMFORT & RECOVERY: Maintain established oral nutrition, medication schedule, and ambulation plan.',
      '3. DISCHARGE / STEP-DOWN: Review criteria for step-down or discharge during next clinical rounds.'
    ];
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  protocols.forEach((step, idx) => {
    doc.text(step, 18, curY + 6 + (idx * 5));
  });

  // ================= 8. CLINICIAN ATTESTATION & SIGN-OFF =================
  curY += 30;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(14, curY, 182, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGray);
  doc.text('Assessing Clinician Name:', 18, curY + 6);
  doc.text('Signature / Stamp:', 90, curY + 6);
  doc.text('Date & Verification:', 150, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyDark);
  doc.text(clinicianName, 18, curY + 13);
  doc.text('_________________________', 90, curY + 13);
  doc.text(`${formattedDate}`, 150, curY + 13);

  // ================= 9. FOOTER & LEGAL DISCLAIMER =================
  doc.setDrawColor(...cardBorder);
  doc.line(14, 285, 196, 285);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'CONFIDENTIAL HEALTHCARE RECORD — VitalGuard AI Clinical Decision Support Engine. For authorized clinical personnel use only.',
    14,
    290
  );
  doc.text('Page 1 of 1', 185, 290);

  // Save the PDF file with a clean professional filename
  const cleanPatientName = (patient?.name || `Patient_${vitals.patient_id || 'ID'}`).replace(/\s+/g, '_');
  const filename = `VitalGuard_Report_${cleanPatientName}_${riskConfig.label}_${formattedDate.replace(/[\s,]+/g, '_')}.pdf`;
  
  doc.save(filename);
  return filename;
};
