import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadDocument from './pages/UploadDocument';
// import ViewDocument from './pages/ViewDocument';
import SignDocument from './pages/SignDocument';
import SendSigningRequest from './pages/SendSigningRequest';
import PublicSigning from './pages/PublicSigning';
import SigningComplete from './pages/SigningComplete';
import AuditLogs from './pages/AuditLogs';
import { isAuthenticated } from './utils/auth';
import GoogleCallback from './pages/GoogleCallback';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { ToastProvider } from './contexts/ToastContext';

function ProtectedRoute({ children }) {
  console.log('🔒 ProtectedRoute check:', isAuthenticated());
  return isAuthenticated() ? children : <Navigate to="/login" />;
}

function App() {
  console.log('🚀 App.jsx loaded, current path:', window.location.pathname);
  
  return (
    <ToastProvider> 
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sign/:token" element={<PublicSigning />} />

          <Route path="/signing-complete" element={<SigningComplete />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadDocument />
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="/document/:id"
            element={
              <ProtectedRoute>
                <ViewDocument />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/document/:id/sign"
            element={
              <ProtectedRoute>
                <SignDocument />
              </ProtectedRoute>
            }
          />
          <Route
            path="/send-signing-request/:id"
            element={
              <ProtectedRoute>
                <SendSigningRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" />} />

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;