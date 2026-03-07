import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

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
        setError(err.message || 'Failed to login');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex',
      minHeight: '100vh', 
      backgroundColor: '#fff',
      color: '#111827',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Left side: Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem 5%', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        
        {/* Nav header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <ArrowLeft size={18} /> Back to Home
            </Link>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ff6b6b' }}></div>
                VitalGuard
            </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
            >
                <h1 style={{ fontSize: '3.5rem', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '1rem' }}>
                    Welcome<br />back.
                </h1>
                <p style={{ color: '#4b5563', fontSize: '1.1rem', marginBottom: '3rem' }}>
                    Enter your details below to access the clinician workspace.
                </p>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>Email address</label>
                        <input 
                            type="email" 
                            style={{ 
                                width: '100%', 
                                padding: '1rem', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '16px',
                                outline: 'none',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                backgroundColor: '#f9fafb'
                            }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="dr.smith@vitalguard.com"
                            onFocus={(e) => { e.target.style.borderColor = '#111827'; e.target.style.backgroundColor = '#fff'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.backgroundColor = '#f9fafb'; }}
                        />
                    </div>
                    
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>Password</label>
                            <a href="#" style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 600, textDecoration: 'underline' }}>Forgot Password?</a>
                        </div>
                        <input 
                            type="password" 
                            style={{ 
                                width: '100%', 
                                padding: '1rem', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '16px',
                                outline: 'none',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                backgroundColor: '#f9fafb'
                            }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            onFocus={(e) => { e.target.style.borderColor = '#111827'; e.target.style.backgroundColor = '#fff'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.backgroundColor = '#f9fafb'; }}
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            marginTop: '1rem',
                            background: '#111827',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }}
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} />
                    </motion.button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', margin: '2.5rem 0', color: '#9CA3AF' }}>
                    <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                    <span style={{ margin: '0 1rem', fontSize: '0.85rem', fontWeight: 500 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                </div>

                <motion.button 
                    whileHover={{ scale: 1.02, background: '#f9fafb' }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'white',
                        color: '#111827',
                        border: '1px solid #E5E7EB',
                        borderRadius: '16px',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </motion.button>
                
                <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.9rem', color: '#6B7280' }}>
                    Don't have an account? <Link to="/login" style={{ color: '#111827', fontWeight: 600 }}>Request Access</Link>
                </p>
            </motion.div>
        </div>
      </div>

      {/* Right side: Image block */}
      <div style={{ flex: 1, backgroundColor: '#EBE6FF', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: '4rem' }}>
        
        {/* Background Blobs matching landing page */}
        <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{
                position: 'absolute', right: '10%', top: '10%',
                width: '350px', height: '350px',
                background: '#D9F99D',
                borderRadius: '50% 30% 60% 40% / 40% 50% 60% 50%',
                zIndex: 1
            }}>
        </motion.div>
        
        <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{
                position: 'absolute', left: '10%', bottom: '20%',
                width: '200px', height: '200px',
                background: '#FFB6E1',
                borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                zIndex: 2
            }}>
        </motion.div>
        
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
            <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '3rem', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.5)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#FF6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                    <Activity size={24} color="white" />
                </div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '1.5rem', color: '#111827' }}>
                    Premium Medical Platform inside.
                </h2>
                <p style={{ color: '#4B5563', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                    Access complete patient history, real-time vital monitoring, and AI predictive insights to enhance your hospital's operational efficiency.
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex' }}>
                         {[40, 45, 50, 55].map((id, i) => (
                              <div key={i} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid white', marginLeft: i === 0 ? 0 : '-15px', overflow: 'hidden' }}>
                                  <img src={`https://i.pravatar.cc/100?img=${id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="User" />
                              </div>
                          ))}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                        Trusted by 500+ clinics
                    </div>
                </div>
            </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
