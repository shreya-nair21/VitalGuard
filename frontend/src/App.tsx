import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import PatientAssessment from './pages/PatientAssessment.tsx';
import RiskAssessment from './pages/RiskAssessment.tsx';
import PatientHistory from './pages/PatientHistory.tsx';
import PatientList from './pages/PatientList.tsx';
import LandingPage from './pages/LandingPage.tsx';
import Settings from './pages/Settings.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider, RequireAuth } from './context/AuthContext.tsx';
import { Toaster } from 'sonner';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster 
            position="top-right" 
            richColors 
            duration={3000} 
          />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/app" element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="patients" element={<PatientList />} />
              <Route path="assessment" element={<PatientAssessment />} />
              <Route path="risk-assessment" element={<RiskAssessment />} />
              <Route path="history" element={<PatientHistory />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* Catch-all redirect to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
