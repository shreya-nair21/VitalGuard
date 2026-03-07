import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Star, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div style={{ backgroundColor: '#fff', color: '#111827', fontFamily: 'Poppins, sans-serif', overflowX: 'hidden' }}>
      
      {/* Top Banner Background - mimicking the light purple top area of the reference */}
      <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '900px',
          background: 'linear-gradient(180deg, #EBE6FF 0%, rgba(235, 230, 255, 0.4) 60%, rgba(255,255,255,0) 100%)',
          zIndex: 0,
          borderBottomLeftRadius: '50% 10%',
          borderBottomRightRadius: '50% 10%',
      }}></div>

      <div style={{ position: 'relative', zIndex: 10 }}>
          {/* Navigation */}
          <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 5%', maxWidth: '1440px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-1px' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#ff6b6b' }}></div>
                VitalGuard
            </div>
            
            <div style={{ display: 'flex', gap: '2.5rem', fontSize: '0.95rem', fontWeight: 500, color: '#4b5563' }}>
                <a href="#home" style={{ color: '#111827' }}>Home</a>
                <a href="#landings">Landings <span style={{fontSize:'0.7rem'}}>▼</span></a>
                <a href="#features">Features <span style={{fontSize:'0.7rem'}}>▼</span></a>
                <a href="#cms">CMS <span style={{fontSize:'0.7rem'}}>▼</span></a>
                <a href="#template">Template <span style={{fontSize:'0.7rem'}}>▼</span></a>
            </div>

            <Link to="/login">
                <button style={{ 
                    padding: '0.6rem 1.25rem',
                    borderRadius: '50px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                }}>
                    Get VitalGuard now <ArrowRight size={16} />
                </button>
            </Link>
          </nav>

          {/* Hero Section */}
          <main style={{ display: 'flex', padding: '4rem 5%', maxWidth: '1440px', margin: '0 auto', alignItems: 'center', minHeight: '600px' }}>
             {/* Left side text */}
             <div style={{ flex: 1, paddingRight: '2rem' }}>
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ 
                        fontSize: '5.5rem', 
                        fontWeight: 700, 
                        lineHeight: 1.05,
                        letterSpacing: '-2px',
                        marginBottom: '2rem'
                    }}
                >
                   Scale with<br />
                   VitalGuard<br />
                   clinical AI
                </motion.h1>
                
                <Link to="/login">
                    <motion.button 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: '#FF6B6B',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 10px 20px rgba(255, 107, 107, 0.3)'
                        }}
                    >
                        <ArrowRight size={24} style={{ transform: 'rotate(-45deg)' }} />
                    </motion.button>
                </Link>
             </div>

             {/* Right side Images */}
             <div style={{ flex: 1, position: 'relative', height: '600px' }}>
                {/* Background Blobs */}
                <motion.div 
                    animate={{ scale: [1, 1.05, 1], rotate: [-15, -10, -15] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        position: 'absolute', right: '5%', top: '5%',
                        width: '450px', height: '450px',
                        background: '#D9F99D',
                        borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                        zIndex: 1
                    }}>
                </motion.div>
                
                <motion.div 
                    animate={{ y: [0, 20, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        position: 'absolute', left: '0%', top: '35%',
                        width: '180px', height: '180px',
                        background: '#FFB6E1',
                        borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                        zIndex: 2
                    }}>
                </motion.div>

                {/* Hero Person Image */}
                <motion.img 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    src="/images/hero_doc.png"
                    alt="Hero Doctor" 
                    style={{
                        position: 'absolute',
                        right: '5%',
                        bottom: '-10%',
                        height: '110%',
                        objectFit: 'contain',
                        zIndex: 3,
                        filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.15))'
                    }} 
                />
             </div>
          </main>

          {/* Avatar Row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', padding: '2rem 5%', marginTop: '4rem', flexWrap: 'wrap' }}>
             {[
               {bg: '#FCD34D', id: 40, rounded: '40px'},
               {bg: '#FCA5A5', id: 45, rounded: '50%'},
               {bg: '#FDBA74', id: 50, rounded: '50px'},
               {bg: '#F9A8D4', id: 55, rounded: '30px'},
               {bg: '#93C5FD', id: 60, rounded: '50%'}
             ].map((item, i) => (
                <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                        width: '190px', height: '190px',
                        borderRadius: item.rounded,
                        background: item.bg,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'center',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                >
                    <img src={`https://i.pravatar.cc/300?img=${item.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply' }} alt="User" />
                </motion.div>
             ))}
          </div>

          {/* Feature 1 */}
          <section style={{ padding: '8rem 5%', maxWidth: '1440px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'center' }}>
              <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6B7280' }}></div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4B5563' }}>Premium Medical Platform</span>
                  </div>
                  <h2 style={{ fontSize: '4.5rem', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-1.5px', marginBottom: '2rem' }}>
                      Achieve<br />outstanding<br />results with<br />VitalGuard
                  </h2>
                  <Link to="/login" style={{ display: 'inline-block' }}>
                      <motion.button 
                          whileHover={{ scale: 1.05 }}
                          style={{
                              background: '#D9F99D',
                              color: '#4D7C0F',
                              border: 'none',
                              padding: '0.75rem 1.5rem',
                              borderRadius: '50px',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                          }}
                      >
                          See more <ArrowRight size={16} />
                      </motion.button>
                  </Link>
              </div>

              <div style={{ 
                  background: '#E0F2FE', 
                  borderRadius: '40px', 
                  minHeight: '600px',
                  position: 'relative',
                  overflow: 'hidden'
              }}>
                  <img src="/images/dashboard_ui.png" alt="Dashboard" style={{ position: 'absolute', bottom: '0', right: '-10%', width: '110%', zIndex: 1, objectFit: 'cover' }} />
                  
                  {/* Floating elements inside image box to give it that "premium" look */}
                  <motion.div 
                     animate={{ y: [-10, 10, -10] }}
                     transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                     style={{ position: 'absolute', top: '20%', left: '15%', zIndex: 2 }}
                  >
                     <Activity size={32} color="#94A3B8" opacity={0.5} />
                  </motion.div>
              </div>
          </section>

          {/* Feature 2 */}
          <section style={{ padding: '4rem 5% 8rem', maxWidth: '1440px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'center' }}>
              
              <div style={{ 
                  background: '#EBE6FF', 
                  borderRadius: '40px', 
                  minHeight: '600px',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
              }}>
                   <motion.div 
                       initial={{ y: 50, opacity: 0 }}
                       whileInView={{ y: 0, opacity: 1 }}
                       transition={{ delay: 0.5 }}
                       style={{ position: 'absolute', bottom: '15%', left: '15%', background: 'white', padding: '1rem', borderRadius: '16px', zIndex: 3, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                   >
                       <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.5rem', fontWeight: 500 }}>Active Clinicians</div>
                       <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#C4B5FD', border: '2px solid white' }}></div>
                           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#93C5FD', border: '2px solid white', marginLeft: '-15px' }}></div>
                           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3B82F6', border: '2px solid white', marginLeft: '-15px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600 }}>+</div>
                       </div>
                   </motion.div>

                  <img src="/images/feature_doc.png" alt="Professional Doctor" style={{ position: 'absolute', bottom: '0', width: '130%', zIndex: 1, filter: 'drop-shadow(0 -10px 20px rgba(0,0,0,0.15))' }} />
              </div>

              <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6B7280' }}></div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4B5563' }}>Premium Medical Platform</span>
                  </div>
                  <h2 style={{ fontSize: '4rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: '2rem' }}>
                      Transform the way<br />you monitor<br />patients
                  </h2>
                  <Link to="/login" style={{ display: 'inline-block' }}>
                      <motion.button 
                          whileHover={{ scale: 1.05 }}
                          style={{
                              background: '#D9F99D',
                              color: '#4D7C0F',
                              border: 'none',
                              padding: '0.75rem 1.5rem',
                              borderRadius: '50px',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                          }}
                      >
                          See more <ArrowRight size={16} />
                      </motion.button>
                  </Link>
              </div>
          </section>

          {/* Testimonial Section like image */}
          <section style={{ padding: '2rem 5% 8rem', maxWidth: '1440px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
             <div style={{ background: '#EBE6FF', borderRadius: '32px', padding: '6rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '3rem', fontWeight: 500, fontFamily: 'serif', letterSpacing: '-1px' }}>Merced</h3>
             </div>
             
             <div style={{ background: 'white', borderRadius: '32px', padding: '4rem 3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ color: '#A78BFA', fontSize: '4rem', lineHeight: 0.5, marginBottom: '1.5rem', fontFamily: 'serif' }}>"</div>
                <h4 style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '2rem' }}>
                    We have no regrets! Wow what great service, I love it! VitalGuard was worth a fortune to my hospital. Thank you for making it painless, pleasant and most of all hassle free
                </h4>
                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '2rem' }}>
                   {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#FACC15" color="#FACC15" />)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FCA5A5', overflow:'hidden' }}>
                      <img src="https://i.pravatar.cc/150?img=5" style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Reviewer" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>Lillahy H</div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Chief Director at Merced</div>
                    </div>
                </div>
             </div>
          </section>
      </div>
    </div>
  );
};

export default LandingPage;
