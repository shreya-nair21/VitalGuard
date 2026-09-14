import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Pill, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { createPrescription, type PrescriptionCreate } from '../../services/api';
import { toast } from 'sonner';

interface PrescriptionModalProps {
  patientId: number;
  patientName: string;
  roomNumber?: string;
  assignmentId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const QUICK_PRESETS = [
  { name: 'Crocin 650mg', dose: '650mg', route: 'Oral (PO)', freq: 'TDS (3x/day)', dur: '3 days', note: 'Administer after meals for fever > 100°F' },
  { name: 'Paracetamol 500mg', dose: '500mg', route: 'Oral (PO)', freq: 'TDS (3x/day)', dur: '3 days', note: 'For fever/body ache. Maximum 2g/day' },
  { name: 'Paracetamol IV 1g', dose: '1000mg', route: 'Intravenous (IV)', freq: 'STAT (Immediate)', dur: '1 dose', note: 'Infuse over 15 mins for acute high fever' },
  { name: 'Normal Saline (0.9% NaCl)', dose: '500ml', route: 'Intravenous (IV)', freq: 'STAT (Immediate)', dur: '4 hours', note: 'For volume support & hypotension' },
  { name: 'Aspirin 75mg', dose: '75mg', route: 'Oral (PO)', freq: 'OD (Once daily)', dur: '5 days', note: 'Take with food' },
];

export const PrescriptionModal = ({
  patientId,
  patientName,
  roomNumber,
  assignmentId,
  onClose,
  onSuccess,
}: PrescriptionModalProps) => {
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [route, setRoute] = useState('Oral (PO)');
  const [frequency, setFrequency] = useState('TDS (3x/day)');
  const [duration, setDuration] = useState('3 days');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setMedicationName(preset.name);
    setDosage(preset.dose);
    setRoute(preset.route);
    setFrequency(preset.freq);
    setDuration(preset.dur);
    setInstructions(preset.note);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationName.trim() || !dosage.trim()) {
      toast.error('Please enter medication name and dosage');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: PrescriptionCreate = {
        patient_id: patientId,
        assignment_id: assignmentId,
        medication_name: medicationName.trim(),
        dosage: dosage.trim(),
        route,
        frequency,
        duration: duration.trim(),
        instructions: instructions.trim() || undefined,
      };

      await createPrescription(payload);
      toast.success(`Prescription issued for ${patientName}`, {
        description: `${medicationName} (${dosage}) recorded in hospital ledger.`,
        icon: <CheckCircle2 size={16} />
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(1, 30, 59, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '560px',
          borderRadius: '4px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Pill size={20} color="#4338ca" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#011e3b' }}>
                Assign Medications & Clinical Suggestions
              </h3>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Patient: <strong>{patientName}</strong> {roomNumber ? `• Room ${roomNumber}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Quick Presets */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Sparkles size={13} /> Quick Emergency Medication Presets
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {QUICK_PRESETS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => applyPreset(p)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    backgroundColor: medicationName === p.name ? '#4338ca' : '#f1f5f9',
                    color: medicationName === p.name ? '#ffffff' : '#011e3b',
                    border: '1px solid',
                    borderColor: medicationName === p.name ? '#4338ca' : '#cbd5e1',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.15s ease'
                  }}
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#011e3b', marginBottom: '0.35rem' }}>
                Medication Name *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Crocin 650mg / Paracetamol"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#011e3b', marginBottom: '0.35rem' }}>
                Dosage *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 650mg, 1g"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#011e3b', marginBottom: '0.35rem' }}>
                Route
              </label>
              <select
                className="input-field"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="Oral (PO)">Oral (PO)</option>
                <option value="Intravenous (IV)">Intravenous (IV)</option>
                <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                <option value="Inhalation">Inhalation</option>
                <option value="Sublingual">Sublingual</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#011e3b', marginBottom: '0.35rem' }}>
                Frequency
              </label>
              <select
                className="input-field"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="STAT (Immediate)">STAT (Immediate)</option>
                <option value="TDS (3x/day)">TDS (3x/day)</option>
                <option value="BD (2x/day)">BD (2x/day)</option>
                <option value="OD (Once daily)">OD (Once daily)</option>
                <option value="SOS (As needed)">SOS (As needed)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#011e3b', marginBottom: '0.35rem' }}>
                Duration
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 3 days"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#011e3b', marginBottom: '0.35rem' }}>
              Doctor Clinical Suggestions & Monitoring Notes
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. Monitor SpO2 and temperature every 30 minutes. Keep oxygen cannula on standby if SpO2 drops below 92%."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#eef2ff', borderRadius: '4px', border: '1px solid #c7d2fe', marginBottom: '1.5rem' }}>
            <AlertCircle size={16} color="#4338ca" />
            <span style={{ fontSize: '0.75rem', color: '#3730a3', fontWeight: 600 }}>
              Assigned orders will be instantly visible on the patient record and the Admin oversight dashboard.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ padding: '0.6rem 1.25rem', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.5rem', fontWeight: 700 }}
            >
              {isSubmitting ? 'Saving to Ledger...' : 'Issue Prescription & Advice'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
