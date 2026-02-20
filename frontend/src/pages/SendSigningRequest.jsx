import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getCurrentUser, logout } from '../utils/auth';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

function SendSigningRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [document, setDocument] = useState(null);
  const [user, setUser] = useState(null);
  const [signers, setSigners] = useState([{ name: '', email: '', order: 1 }]);
  const [customMessage, setCustomMessage] = useState('');
  const [enableSigningOrder, setEnableSigningOrder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailRoutingActive, setEmailRoutingActive] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
    }
    fetchDocument();
    checkEmailRouting();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await api.get(`/api/documents/${id}`);
      setDocument(response.data);
    } catch (err) {
      setError('Failed to load document');
    }
  };

  const checkEmailRouting = async () => {
    try {
      const response = await api.get('/api/config/email-routing');
      setEmailRoutingActive(response.data.enabled);
    } catch (err) {
    }
  };

  const validateEmail = (email) => {
    if (!email.includes('@')) {
      return 'Invalid email address';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const addSigner = () => {
    if (signers.length >= 10) {
      alert('Maximum 10 signers allowed');
      return;
    }
    setSigners([...signers, { name: '', email: '', order: signers.length + 1 }]);
  };

  const removeSigner = (index) => {
    if (signers.length === 1) {
      alert('At least one signer is required');
      return;
    }
    const newSigners = signers.filter((_, i) => i !== index);
    newSigners.forEach((signer, i) => {
      signer.order = i + 1;
    });
    setSigners(newSigners);
  };

  const updateSigner = (index, field, value) => {
    const newSigners = [...signers];
    newSigners[index][field] = value;
    setSigners(newSigners);
  };

  const moveSignerUp = (index) => {
    if (index === 0) return;
    const newSigners = [...signers];
    [newSigners[index - 1], newSigners[index]] = [newSigners[index], newSigners[index - 1]];
    newSigners.forEach((signer, i) => {
      signer.order = i + 1;
    });
    setSigners(newSigners);
  };

  const moveSignerDown = (index) => {
    if (index === signers.length - 1) return;
    const newSigners = [...signers];
    [newSigners[index], newSigners[index + 1]] = [newSigners[index + 1], newSigners[index]];
    newSigners.forEach((signer, i) => {
      signer.order = i + 1;
    });
    setSigners(newSigners);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      
      if (!signer.name.trim() || signer.name.trim().length < 2) {
        setError(`Signer ${i + 1}: Please enter a valid name (at least 2 characters)`);
        return;
      }

      const emailError = validateEmail(signer.email);
      if (emailError) {
        setError(`Signer ${i + 1}: ${emailError}`);
        return;
      }
    }

    const emails = signers.map(s => s.email.toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicates.length > 0) {
      setError(`Duplicate email addresses found: ${duplicates.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      await api.post(`/api/documents/${id}/send-multiple-signing-requests`, {
        signers: signers.map(s => ({
          signer_name: s.name,
          signer_email: s.email,
          signing_order: enableSigningOrder ? s.order : 0
        })),
        custom_message: customMessage || null,
        enable_signing_order: enableSigningOrder
      });

      setSuccess(true);
      toast.success(`✅ Signing requests sent to ${signers.length} signer(s)!`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Send error:', err);
      toast.error(error.response?.data?.detail || '❌ Failed to send signing requests');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">

      <nav className="bg-white shadow-sm border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-slate-700">
                ✍️ SignFlow
              </h1>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                ← Dashboard
              </button>
            </div>
            <div className="flex items-center gap-3">
              {user && <span className="text-slate-700 font-medium hidden sm:block">{user.name}</span>}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-2 rounded-lg hover:from-rose-600 hover:to-rose-700 transition font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>


      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-emerald-100">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-slate-700 mb-2">
            📧 Send Signing Request
          </h2>
          <p className="text-slate-600 mb-6">Send secure signing links via email</p>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-emerald-700 font-bold text-xl mb-2">Emails Sent!</h3>
              <p className="text-emerald-600">
                Signing requests have been sent to <strong>{signers.length}</strong> {signers.length === 1 ? 'signer' : 'signers'}
              </p>
              <p className="text-slate-600 text-sm mt-2">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>

              {emailRoutingActive && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="font-semibold text-yellow-800 mb-1">Email Routing Active</p>
                      <p className="text-yellow-700 text-sm">
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-slate-800 mb-2">📄 Document:</h3>
                <p className="text-slate-700 font-medium">{document.title}</p>
                <p className="text-slate-500 text-sm">{document.original_filename}</p>
              </div>


              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                    <span className="text-xl">❌</span>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Signers ({signers.length})
                    </label>
                    <button
                      type="button"
                      onClick={addSigner}
                      className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-1"
                    >
                      <span className="text-lg">+</span> Add Signer
                    </button>
                  </div>

                  <div className="space-y-3">
                    {signers.map((signer, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </div>
                            {enableSigningOrder && signers.length > 1 && (
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveSignerUp(index)}
                                  disabled={index === 0}
                                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveSignerDown(index)}
                                  disabled={index === signers.length - 1}
                                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"/>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              required
                              value={signer.name}
                              onChange={(e) => updateSigner(index, 'name', e.target.value)}
                              placeholder="Signer Name"
                              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            />
                            <input
                              type="email"
                              required
                              value={signer.email}
                              onChange={(e) => updateSigner(index, 'email', e.target.value)}
                              placeholder="signer@example.com"
                              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            />
                          </div>
                          {signers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSigner(index)}
                              className="text-rose-600 hover:text-rose-700 p-2"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableSigningOrder}
                      onChange={(e) => setEnableSigningOrder(e.target.checked)}
                      className="mt-1 w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-semibold text-blue-900">Enable Signing Order</p>
                      <p className="text-blue-700 text-sm">
                        Signers will receive requests in sequence. Each signer must complete before the next receives their request.
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message to the signers..."
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                  />
                  <p className="text-slate-500 text-xs mt-1">This message will appear in the email</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">🔒</span>
                    <div>
                      <p className="text-blue-800 text-sm">
                        <strong>Security:</strong> Each signer will receive a unique, secure tokenized link.
                        Links expire in 72 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || signers.some(s => !s.name.trim() || !s.email.trim())}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      `📧 Send to ${signers.length} ${signers.length === 1 ? 'Signer' : 'Signers'}`
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SendSigningRequest;