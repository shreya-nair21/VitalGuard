
import { useState } from 'react';
import { ArrowRight, X, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const meds = [
    { name: 'CoQ10', dose: '50 mg', type: 'softgels', time: '8:00 AM', img: '/images/med_coq10.png' },
    { name: 'Plavix', dose: '75 mg', type: 'tablet', time: '10:00 AM', img: '/images/med_plavix.png' },
];

const doctors = [
    { 
        name: 'Dr. Daniel Lewis', 
        role: 'Oncologist', 
        exp: '6 yrs',
        bio: 'Specializing in precise oncological telemetry and stable diagnostic oversight. Board certified with a focus on predictive oncology.',
        nextSlot: 'Today, 4:30 PM',
        fee: '$150'
    },
    { 
        name: 'Dr. Grace Walker', 
        role: 'Cardiologist', 
        exp: '5 yrs',
        bio: 'Expert in non-invasive cardiac monitoring and telemetry-driven intervention. Dedicated to advanced patient-centric cardiology.',
        nextSlot: 'Tomorrow, 10:00 AM',
        fee: '$180'
    },
    { 
        name: 'Dr. Sarah Smith', 
        role: 'Neurologist', 
        exp: '8 yrs',
        bio: 'Focusing on neuro-telemetry and predictive neurological assessment for complex clinical cases.',
        nextSlot: 'Fri, 11:15 AM',
        fee: '$200'
    },
];

export const OnlineConsultation = () => {
    const [selectedDoc, setSelectedDoc] = useState<typeof doctors[0] | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    const handleBook = () => {
        setIsBooking(true);
        setTimeout(() => {
            toast.success(`Consultation booked with ${selectedDoc?.name}`, {
                description: `Confirmation sent to your clinical dashboard. Scheduled for ${selectedDoc?.nextSlot}.`,
                icon: <CheckCircle2 size={16} />
            });
            setIsBooking(false);
            setSelectedDoc(null);
        }, 1200);
    };

    return (
        <div style={{ marginTop: '2rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Online Consultation</h3>

            </div>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                {doctors.map((doc, i) => (
                    <motion.div 
                        key={i} 
                        whileHover={{ y: -4 }}
                        onClick={() => setSelectedDoc(doc)}
                        className="card" 
                        style={{ 
                            minWidth: '200px', 
                            padding: '1.5rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                        }}
                    >
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#f1f5f9', marginBottom: '1rem', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <img src={`https://i.pravatar.cc/150?u=${doc.name}`} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{doc.name}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>{doc.role}</span>
                        
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', backgroundColor: '#f8fafc', color: '#4338ca', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>{doc.exp}</span>
                            <div style={{ color: '#4338ca' }}>
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    </motion.div>
                ))}
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
                                        <img src={`https://i.pravatar.cc/150?u=${selectedDoc.name}`} alt={selectedDoc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.3rem' }}>{selectedDoc.name}</h2>
                                    <span style={{ fontSize: '0.9rem', color: '#4338ca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selectedDoc.role} • {selectedDoc.exp} Exp</span>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '0.75rem' }}>Clinical Biography</h4>
                                    <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                                        {selectedDoc.bio}
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem' }}>
                                            <Calendar size={14} /> NEXT SLOT
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#011e3b' }}>{selectedDoc.nextSlot}</div>
                                    </div>
                                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem' }}>
                                            <Clock size={14} /> CONSULT FEE
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#011e3b' }}>{selectedDoc.fee}</div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleBook}
                                    disabled={isBooking}
                                    style={{
                                        width: '100%',
                                        padding: '1.1rem',
                                        backgroundColor: '#4338ca',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        cursor: isBooking ? 'wait' : 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => !isBooking && (e.currentTarget.style.backgroundColor = '#3730a3')}
                                    onMouseOut={(e) => !isBooking && (e.currentTarget.style.backgroundColor = '#4338ca')}
                                >
                                    {isBooking ? 'Finalizing Schedule...' : 'Book Clinical Consultation'}
                                </button>
                                <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                    Standard institutional billing cycles apply.
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const MedicationList = () => (
    <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Your Medications</h3>
             <span style={{ fontSize: '0.875rem', background: '#4338ca', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>Today: 8</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {meds.map((med, i) => (
                 <div key={i} style={{ flex: 1, background: '#f8fafc', color: '#011e3b', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                     <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Take at {med.time}</div>
                     <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '50px', height: '50px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={med.img} alt={med.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.1rem' }}>{med.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{med.dose} • {med.type}</div>
                        </div>
                     </div>
                 </div>
             ))}
        </div>
    </div>
);
