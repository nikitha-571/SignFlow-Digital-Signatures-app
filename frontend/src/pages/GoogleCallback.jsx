import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../utils/auth';
import api from '../utils/api';

function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const processingRef = useRef(false); 

  useEffect(() => {
    const handleCallback = async () => {
      if (processingRef.current) {
        console.log('⏭️ Already processing, skipping...');
        return;
      }

      processingRef.current = true;

      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setError('Google login was cancelled or failed');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        console.log('📝 Processing Google callback with code');

        const response = await api.post('/api/auth/google/callback', { code });

        console.log('✅ Google login successful:', response.data);

        const { access_token, user } = response.data;

        login(access_token, user);

        console.log('✅ Token and user saved to localStorage');

        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('❌ Google callback error:', err);
        console.error('❌ Error response:', err.response?.data);
        
        const errorMessage = err.response?.data?.detail || 'Authentication failed';
        setError(errorMessage);
        
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      } finally {
      }
    };

    handleCallback();
  }, []); 

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-emerald-100 text-center">
        {error ? (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-rose-600 mb-4">Authentication Failed</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <p className="text-slate-500 text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Completing Sign In</h2>
            <p className="text-slate-600">Please wait while we set up your account...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default GoogleCallback;