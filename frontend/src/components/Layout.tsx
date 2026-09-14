import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Bell, 
  LogOut,
  Moon, 
  Sun,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Layout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className="layout">
      {/* ... (keep existing sidebar content) */}
      <aside className="sidebar">
        {/* ... (logo and nav) */}
        <div className="sidebar-logo">
          <Shield size={26} color="#4338ca" />
          <span style={{ fontFamily: "serif", fontSize: '1.4rem', color: 'var(--text-main)' }}>VitalGuard</span>
        </div>
        
        <nav>
          <NavLink to="/app" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink to="/app/patients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            Patient Records
          </NavLink>
          <NavLink to="/app/assessment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Activity size={20} />
            New Assessment
          </NavLink>
          <NavLink to="/app/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Bell size={20} />
            History/Alerts
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={toggleTheme}
            className="nav-link"
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              width: '100%', 
              justifyContent: 'flex-start',
              color: 'var(--text-muted)'
            }}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          



          {user?.role === 'admin' && (
            <NavLink to="/app/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Shield size={20} />
              Settings & Users
            </NavLink>
          )}
          <div className="user-profile">
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user?.role || 'Clinician'}</div>
            </div>
            <button 
              onClick={logout} 
              style={{ 
                marginLeft: 'auto', 
                background: 'none', 
                border: 'none', 
                color: '#ef4444', 
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
