import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowRight, ArrowLeft, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        try {
            if (!email || !password) {
                throw new Error('Please enter both email and password');
            }
            
            await login(email, password);
            navigate('/app');
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please verify your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ 
            display: 'flex',
            minHeight: '100vh', 
            backgroundColor: '#f8fafc',
            color: '#011e3b',
            fontFamily: "'Inter', sans-serif",
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    width: '100%',
                    maxWidth: '440px'
                }}
            >
                {/* Institutional Back Link */}
                <Link to="/" style={{ 
                    textDecoration: 'none', 
                    color: '#64748b', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    fontWeight: 700, 
                    marginBottom: '2.5rem', 
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    <ArrowLeft size={14} /> Return to Portal
                </Link>

                {/* Primary Login Card (Solid Institutional Style) */}
                <div style={{
                    backgroundColor: '#ffffff',
                    padding: '3.5rem 3rem',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
                }}>
                    
                    {/* Branding Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                        <Shield size={28} color="#4338ca" />
                        <span style={{ 
                            fontFamily: 'Lora, serif', 
                            fontWeight: 900, 
                            fontSize: '1.5rem',
                            color: '#011e3b'
                        }}>VitalGuard</span>
                    </div>

                    <h1 style={{ 
                        fontFamily: 'Lora, serif',
                        fontSize: '1.8rem', 
                        fontWeight: 900, 
                        color: '#011e3b',
                        marginBottom: '0.75rem',
                        letterSpacing: '-0.01em'
                    }}>
                        Secure Clinician Login
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                        Authenticate to access the clinical intelligence workspace.
                    </p>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Work Email</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '3rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                    color: '#94a3b8'
                                }}>
                                    <Mail size={18} />
                                </div>
                                <input 
                                    type="email" 
                                    required
                                    style={{ 
                                        width: '100%', 
                                        display: 'block',
                                        boxSizing: 'border-box',
                                        padding: '0.85rem 1rem 0.85rem 3rem', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '4px',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.5',
                                        transition: 'border-color 0.2s',
                                        backgroundColor: '#ffffff',
                                        color: '#011e3b',
                                        fontFamily: 'inherit'
                                    }}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="clinician@vitalguard.med"
                                    onFocus={(e) => { e.target.style.borderColor = '#4338ca'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passphrase</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '3rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none',
                                    color: '#94a3b8'
                                }}>
                                    <Lock size={18} />
                                </div>
                                <input 
                                    type="password" 
                                    required
                                    style={{ 
                                        width: '100%', 
                                        display: 'block',
                                        boxSizing: 'border-box',
                                        padding: '0.85rem 1rem 0.85rem 3rem', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '4px',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.5',
                                        transition: 'border-color 0.2s',
                                        backgroundColor: '#ffffff',
                                        color: '#011e3b',
                                        fontFamily: 'inherit'
                                    }}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    onFocus={(e) => { e.target.style.borderColor = '#4338ca'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                                />
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ 
                                        padding: '1rem', 
                                        backgroundColor: '#fef2f2', 
                                        border: '1px solid #fee2e2', 
                                        color: '#b91c1c', 
                                        borderRadius: '4px', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 600 
                                    }}
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button 
                            disabled={isLoading}
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                marginTop: '0.5rem',
                                backgroundColor: '#4338ca',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: isLoading ? 'wait' : 'pointer',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.6rem',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#3730a3'; }}
                            onMouseOut={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#4338ca'; }}
                        >
                            {isLoading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
                        </button>
                    </form>

                    <div style={{ marginTop: '3.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Clinical Protocol 704-B <br/>
                        Authorized Personnel Only
                    </div>
                </div>
            </motion.div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Inter:wght@400;600;700;800;900&display=swap');
                
                h1, h2, h3, h4, span[style*="serif"] {
                    font-family: 'Lora', serif !important;
                }
            `}</style>

        </div>
    );
};

export default Login;
