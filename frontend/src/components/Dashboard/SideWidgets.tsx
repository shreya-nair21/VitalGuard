import { useState, useEffect } from 'react';
import { ArrowRight, X, Clock, Calendar, CheckCircle2, Pill } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getDoctors, getPrescriptions, type DoctorProfile, type Prescription } from '../../services/api';

export const OnlineConsultation = () => {
    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<DoctorProfile | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const data = await getDoctors();
                setDoctors(data);
            } catch (err) {
                console.error("Failed to load doctors", err);
            }
        };
        fetchDocs();
    }, []);

    const handleBook = () => {
        setIsBooking(true);
        setTimeout(() => {
            toast.success(`Consultation requested with Dr. ${selectedDoc?.username}`, {
                description: `Scheduled with ${selectedDoc?.specialty || 'General Medicine'}. Notification sent to doctor.`,
                icon: <CheckCircle2 size={16} />
            });
            setIsBooking(false);
            setSelectedDoc(null);
        }, 1000);
    };

    return (
        <div style={{ marginTop: '2rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>Online Consultation</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {doctors.filter(d => d.availability === 'available').length} Available Now
                </span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                {doctors.map((doc) => {
                    const isAvail = doc.availability === 'available';
                    const isBusy = doc.availability === 'busy';

                    return (
                        <motion.div 
                            key={doc.id} 
                            whileHover={{ y: -4 }}
                            onClick={() => setSelectedDoc(doc)}
                            className="card" 
                            style={{ 
                                minWidth: '220px', 
                                padding: '1.5rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s',
                                position: 'relative'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '999px',
                                backgroundColor: isAvail ? '#dcfce7' : isBusy ? '#fef3c7' : '#f1f5f9',
                                color: isAvail ? '#15803d' : isBusy ? '#b45309' : '#64748b'
                            }}>
                                <span style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    backgroundColor: isAvail ? '#22c55e' : isBusy ? '#f59e0b' : '#94a3b8'
                                }} />
                                {isAvail ? 'Free' : isBusy ? 'Busy' : 'Off'}
                            </div>

                            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#f1f5f9', marginBottom: '1rem', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <img src={`https://i.pravatar.cc/150?u=${doc.username}`} alt={doc.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Dr. {doc.username}</h4>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>{doc.specialty || 'General Medicine'}</span>
                            
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', backgroundColor: '#f8fafc', color: '#4338ca', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                    Gen Med
                                </span>
                                <div style={{ color: '#4338ca' }}>
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Doctor Profile Modal */}
            <AnimatePresence>
                {selectedDoc && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="modal-backdrop"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(1, 30, 59, 0.4)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem'
                        }}
                        onClick={() => !isBooking && setSelectedDoc(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                backgroundColor: '#ffffff',
                                width: '100%',
                                maxWidth: '440px',
                                borderRadius: '4px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                                    <button 
                                        onClick={() => setSelectedDoc(null)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem' }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                    <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto 1.25rem', overflow: 'hidden', border: '3px solid #fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                        <img src={`https://i.pravatar.cc/150?u=${selectedDoc.username}`} alt={selectedDoc.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.3rem' }}>Dr. {selectedDoc.username}</h2>
                                    <span style={{ fontSize: '0.9rem', color: '#4338ca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {selectedDoc.specialty || 'General Medicine'} • {selectedDoc.availability.toUpperCase()}
                                    </span>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '0.75rem' }}>Clinical Profile</h4>
                                    <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                                        Board-certified in General Medicine with expertise in inpatient telemetry, vital sign stabilization, and critical clinical triage.
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem' }}>
                                            <Calendar size={14} /> STATUS
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#011e3b', textTransform: 'capitalize' }}>
                                            {selectedDoc.availability}
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem' }}>
                                            <Clock size={14} /> DEPARTMENT
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#011e3b' }}>
                                            {selectedDoc.specialty || 'General Medicine'}
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleBook}
                                    disabled={isBooking || selectedDoc.availability === 'off_duty'}
                                    style={{
                                        width: '100%',
                                        padding: '1.1rem',
                                        backgroundColor: selectedDoc.availability === 'off_duty' ? '#94a3b8' : '#4338ca',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        cursor: isBooking ? 'wait' : selectedDoc.availability === 'off_duty' ? 'not-allowed' : 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    {isBooking ? 'Connecting...' : selectedDoc.availability === 'off_duty' ? 'Doctor Off Duty' : 'Request Clinical Consultation'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const MedicationList = () => {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMeds = async () => {
            try {
                const data = await getPrescriptions();
                setPrescriptions(data);
            } catch (err) {
                console.error("Failed to load prescriptions", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeds();
    }, []);

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Pill size={18} color="#4338ca" />
                    Medications & Orders
                 </h3>
                 <span style={{ fontSize: '0.875rem', background: '#4338ca', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Active: {prescriptions.length}
                 </span>
            </div>
            
            {loading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    Loading clinical prescriptions...
                </div>
            ) : prescriptions.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    No doctor orders prescribed yet. When a doctor issues prescriptions for a critical patient, they will be listed here.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                     {prescriptions.slice(0, 5).map((med) => (
                         <div key={med.id} style={{ flex: 1, background: '#f8fafc', color: '#011e3b', padding: '1rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {med.frequency} • {med.route}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#4338ca', fontWeight: 700 }}>
                                    {med.room_number ? `Room ${med.room_number}` : med.patient_name}
                                </span>
                             </div>
                             
                             <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <div style={{ width: '40px', height: '40px', background: '#eef2ff', borderRadius: '4px', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca', flexShrink: 0 }}>
                                    <Pill size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.1rem' }}>{med.medication_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        Dose: {med.dosage} • Dr. {med.doctor_name || 'Clinician'}
                                    </div>
                                    {med.instructions && (
                                        <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                            "{med.instructions}"
                                        </div>
                                    )}
                                </div>
                             </div>
                         </div>
                     ))}
                </div>
            )}
        </div>
    );
};
