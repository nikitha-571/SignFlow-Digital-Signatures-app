import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      toast.success('✅ Reset link sent! Check your email.'); 
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-12 w-full max-w-md border border-emerald-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email</h2>
          <p className="text-slate-600 mb-6">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="font-semibold mb-1">Next Steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-left">
              <li>Check your email inbox</li>
              <li>Click the reset link (valid for 1 hour)</li>
              <li>Create a new password</li>
            </ol>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Didn't receive the email? Check your spam folder.
          </p>

          <Link
            to="/login"
            className="inline-block w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-12 w-full max-w-md border border-emerald-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Forgot Password?
          </h1>
          <p className="text-slate-600">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-2">
              Enter the email associated with your account
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 px-4 rounded-xl font-bold hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
               <>
                 <LoadingSpinner size="sm" />
                 <span>Sending...</span>
               </>
             ) : (
               'Send Reset Link'
             )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-600 hover:text-slate-800 transition inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;