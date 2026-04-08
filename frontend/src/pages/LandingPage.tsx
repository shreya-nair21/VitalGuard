import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ChevronRight, Activity, LineChart, Server, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const LandingPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/app', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    return (
        <div style={{ backgroundColor: '#ffffff', color: '#011e3b', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

            {/* Authoritative Header */}
            <header style={{
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
                <nav style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 5%',
                    maxWidth: '1280px',
                    margin: '0 auto'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 900,
                        fontSize: '1.6rem',
                        letterSpacing: '-0.02em',
                        color: '#011e3b'
                    }}>
                        <Shield size={28} color="#4338ca" />
                        <span style={{ fontFamily: "serif" }}>VitalGuard</span>
                    </div>

                    <div style={{ display: 'flex', gap: '3rem', fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>
                        <a href="#clinical" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#4338ca'} onMouseOut={(e) => e.currentTarget.style.color = '#475569'}>Platform</a>
                        <a href="#about" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#4338ca'} onMouseOut={(e) => e.currentTarget.style.color = '#475569'}>About</a>
                    </div>
                </nav>
            </header>

            {/* Stable Architectural Hero Section (No Overlaps) */}
            <main style={{
                padding: '5rem 5% 0 5%',
                maxWidth: '1280px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '5rem',
                alignItems: 'center'
            }}>
                {/* Left Side: Authoritative Copy */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '4px',
                        marginBottom: '2rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#4338ca',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Institutional Standard in Clinical Vigilance
                    </div>

                    <h1 style={{
                        fontFamily: "serif",
                        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                        fontWeight: 900,
                        lineHeight: 1.1,
                        marginBottom: '2rem',
                        color: '#011e3b',
                        letterSpacing: '-0.01em'
                    }}>
                        Clinical Excellence. <br />
                        Predictive Accuracy.
                    </h1>

                    <p style={{
                        fontSize: '1.2rem',
                        color: '#475569',
                        maxWidth: '540px',
                        lineHeight: 1.7,
                        marginBottom: '3.5rem'
                    }}>
                        VitalGuard provides a secure, high-availability infrastructure for real-time patient telemetry and diagnostic foresight. Built for the modern clinical workflow.
                    </p>

                    {/* The Single Unified Login Gateway */}
                    <Link to="/login" style={{ textDecoration: 'none' }}>
                        <button
                            style={{
                                backgroundColor: '#4338ca',
                                color: '#ffffff',
                                border: 'none',
                                padding: '1.1rem 2.8rem',
                                borderRadius: '4px',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#3730a3'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#4338ca'; }}
                        >
                            Clinician Portal Access <ChevronRight size={20} />
                        </button>
                    </Link>
                </motion.div>

                {/* Right Side: Realistic Environmental Visual */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)'
                    }}>
                        <img
                            src="/images/institutional_hero.png"
                            alt="Institutional Clinical Environment"
                            style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }}
                        />
                    </div>
                </motion.div>
            </main>

            {/* Strategic Details Section */}
            <section id="clinical" style={{ padding: '8rem 5%', maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
                    <h2 style={{ fontFamily: "serif", fontSize: '2.5rem', fontWeight: 900, color: '#011e3b', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>Focused Clinical Operations.</h2>
                    <p style={{ color: '#475569', fontSize: '1.15rem', maxWidth: '750px', margin: '0 auto', lineHeight: 1.7 }}>
                        VitalGuard synthesizes complex patient metrics into stable clinical vectors, providing a single point of truth for bedside and remote medical staff.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>

                    {/* Pillar 1 */}
                    <div style={{ padding: '2.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        <div style={{ width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <Activity size={20} color="#4338ca" />
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#011e3b', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Predictive Telemetry</h3>
                        <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            Continuous physiological monitoring that identifies vital trends before critical thresholds are crossed.
                        </p>
                    </div>

                    {/* Pillar 2 */}
                    <div style={{ padding: '2.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        <div style={{ width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <LineChart size={20} color="#4338ca" />
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#011e3b', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Operational Insight</h3>
                        <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            Real-time department-wide visibility enabling clinicians to prioritize care based on patient acuity.
                        </p>
                    </div>

                    {/* Pillar 3 */}
                    <div style={{ padding: '2.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        <div style={{ width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <Server size={20} color="#4338ca" />
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#011e3b', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Native EHR Sync</h3>
                        <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            Bidirectional data synchronization with Epic, Cerner, and hospital data warehouses.
                        </p>
                    </div>
                </div>
            </section>




            {/* Contact & Support Section */}
            <section id="about" style={{ padding: '8rem 5%', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem' }}>

                    {/* Mission */}
                    <div>
                        <h2 style={{ fontFamily: "serif", fontSize: '2rem', fontWeight: 900, color: '#011e3b', marginBottom: '1.5rem' }}>Our Mission.</h2>
                        <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '1rem' }}>
                            VitalGuard is dedicated to providing high-availability infrastructure for modern clinical intelligence. We bridge the gap between complex telemetry and actionable medical foresight.
                        </p>
                    </div>

                    {/* Contact Details */}
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#011e3b', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Clinical Support</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#475569' }}>
                                <Mail size={20} color="#4338ca" />
                                <span style={{ fontWeight: 600 }}>support@vitalguard.med</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#475569' }}>
                                <Phone size={20} color="#4338ca" />
                                <span style={{ fontWeight: 600 }}>+91 1234567890</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#475569' }}>
                                <MapPin size={20} color="#4338ca" />
                                <span style={{ fontWeight: 600 }}>Vadodara, Gujarat</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Inquiry / Placeholder */}
                    <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontWeight: 800, marginBottom: '1rem', color: '#011e3b' }}>Inquiries</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>For institutional deployment inquiries or clinical trial partnerships.</p>
                        <a href="mailto:support@vitalguard.med" style={{ textDecoration: 'none' }}>
                            <button style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#011e3b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#011e3b'}
                            >
                                Contact Enterprise
                            </button>
                        </a>
                    </div>
                </div>
            </section>

            {/* Institutional Footer */}
            <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '4rem 5%', color: '#011e3b' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#011e3b' }}>
                            <Shield size={18} color="#4338ca" /> VitalGuard
                        </div>
                        <div>© 2026 VitalGuard Medical Systems. Built for Excellence.</div>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <span>Security Standards</span>
                            <span>Privacy Policy</span>
                        </div>
                    </div>
                </div>
            </footer>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Inter:wght@400;600;700;800;900&display=swap');
                
                h1, h2, h3, h4, span[style*="serif"] {
                    font-family: 'Lora', serif !important;
                }
            `}</style>
        </div>
    );
};

export default LandingPage;;;
