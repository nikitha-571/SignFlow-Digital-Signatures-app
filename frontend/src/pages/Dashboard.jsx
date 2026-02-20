import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getCurrentUser, logout } from '../utils/auth';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [ownedDocuments, setOwnedDocuments] = useState([]);
  const [receivedDocuments, setReceivedDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    fetchAllDocuments(currentUser);
  }, [navigate]);

  useEffect(() => {
    applyFilters();
  }, [ownedDocuments, receivedDocuments, viewMode, statusFilter, searchQuery, sortBy]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuOpen && !e.target.closest('#mobile-menu') && !e.target.closest('#hamburger-btn')) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const fetchAllDocuments = async (currentUser) => {
    try {
      setLoading(true);
      
      const ownedResponse = await api.get('/api/documents/');
      const owned = Array.isArray(ownedResponse.data) 
        ? ownedResponse.data 
        : ownedResponse.data.documents || [];
      
      const ownedWithRejection = await Promise.all(
        owned.map(async (doc) => {
          if (doc.status === 'rejected') {
            try {
              const signerResp = await api.get(`/api/documents/${doc.id}/signers`);
              const rejectedSigner = signerResp.data.find(s => s.status === 'rejected');
              return {
                ...doc,
                isOwned: true,
                rejectionReason: rejectedSigner?.rejection_reason || null,
                rejectedByEmail: rejectedSigner?.signer_email || null,
              };
            } catch {
              return { ...doc, isOwned: true };
            }
          }
          return { ...doc, isOwned: true };
        })
      );
      setOwnedDocuments(ownedWithRejection);
      
      try {
        const receivedResponse = await api.get('/api/documents/received');
        const received = Array.isArray(receivedResponse.data)
          ? receivedResponse.data
          : receivedResponse.data.documents || [];
        
        const receivedWithTokens = await Promise.all(
          received.map(async (doc) => {
            try {
              const signerResponse = await api.get(`/api/documents/${doc.id}/signers`);
              const signerForCurrentUser = signerResponse.data.find(
                s => s.signer_email === currentUser.email
              );
              return {
                ...doc,
                isOwned: false,
                signingToken: signerForCurrentUser?.signing_token,
                signerStatus: signerForCurrentUser?.status,
                rejectionReason: signerForCurrentUser?.rejection_reason,
              };
            } catch (err) {
              console.error(`Failed to get signing token for doc ${doc.id}:`, err);
              return { ...doc, isOwned: false };
            }
          })
        );
        setReceivedDocuments(receivedWithTokens);
      } catch (err) {
        console.log('⚠️ Received documents endpoint error:', err.message);
        setReceivedDocuments([]);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching documents:', err);
      if (err.response?.status === 401) { logout(); return; }
      toast.error('❌ Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let documents = [];
    if (viewMode === 'all') documents = [...ownedDocuments, ...receivedDocuments];
    else if (viewMode === 'owned') documents = ownedDocuments;
    else if (viewMode === 'received') documents = receivedDocuments;

    if (statusFilter !== 'all') documents = documents.filter(doc => doc.status === statusFilter);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      documents = documents.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.original_filename.toLowerCase().includes(query)
      );
    }

    switch (sortBy) {
      case 'newest': documents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'oldest': documents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'name':   documents.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: break;
    }
    setFilteredDocuments(documents);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/api/documents/${id}`);
      setOwnedDocuments(ownedDocuments.filter(doc => doc.id !== id));
      setReceivedDocuments(receivedDocuments.filter(doc => doc.id !== id));
      toast.success('✅ Document deleted successfully');
      fetchAllDocuments(user);
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('❌ Failed to delete document');
    }
  };

  const handleSignDocument = (doc) => {
    if (doc.isOwned) {
      navigate(`/document/${doc.id}/sign`);
    } else {
      if (doc.signingToken) {
        navigate(`/sign/${doc.signingToken}`);
      } else {
        toast.error('Signing link not available. Please contact the document sender.');
      }
    }
  };

  const handleLogout = () => { logout(); };

  const getStatusBadge = (doc) => {
    if (!doc.isOwned && doc.signerStatus === 'rejected') {
      return <span className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-rose-100 text-rose-700">❌ You Rejected</span>;
    }
    switch (doc.status) {
      case 'signed':   return <span className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-100 text-emerald-700">✅ Signed</span>;
      case 'rejected': return <span className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-rose-100 text-rose-700">❌ Rejected</span>;
      default:         return <span className="px-2 lg:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-100 text-amber-700">⏳ Pending</span>;
    }
  };

  const allDocuments = [...ownedDocuments, ...receivedDocuments];
  const statusCounts = {
    all: allDocuments.length,
    owned: ownedDocuments.length,
    received: receivedDocuments.length,
    pending: allDocuments.filter(d => d.status === 'pending').length,
    signed: allDocuments.filter(d => d.status === 'signed').length,
    rejected: allDocuments.filter(d => d.status === 'rejected').length,
  };

  if (loading && allDocuments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md border-b-2 border-emerald-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-2 lg:p-3 rounded-xl shadow-lg">
                <span className="text-white text-xl lg:text-2xl">✍️</span>
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-slate-700">
                  SignFlow
                </h1>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">Digital Signatures</p>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
                  {user.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.name}
                      className="w-10 h-10 rounded-full shadow-md object-cover"
                      onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                    />
                  ) : null}
                  <div
                    className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ display: user.profile_picture ? 'none' : 'flex' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-5 py-2.5 rounded-xl hover:from-rose-600 hover:to-rose-700 transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>

            <button
              id="hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition relative z-50"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="lg:hidden bg-white border-t border-slate-200 shadow-xl"
          >
            {user && (
              <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 bg-slate-50">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            )}

            <div className="py-2 px-3 flex flex-col gap-1">
              <button
                onClick={() => { navigate('/upload'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-emerald-50 transition text-sm font-semibold text-slate-700 hover:text-emerald-700"
              >
                <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                Upload Document
              </button>

              <button
                onClick={() => { navigate('/audit-logs'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-slate-50 transition text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                Audit Logs
              </button>

              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-rose-50 transition text-sm font-semibold text-rose-600 hover:text-rose-700"
                >
                  <span className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Action Bar */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-16 lg:top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3 lg:gap-4">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">My Documents</h2>
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={() => navigate('/upload')}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Document
              </button>
              <button
                onClick={() => navigate('/audit-logs')}
                className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-6 py-3 rounded-xl hover:from-slate-700 hover:to-slate-800 transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden xl:inline">Audit Logs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-xs lg:text-sm font-medium">Total</span>
              <span className="text-xl lg:text-2xl">📄</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-800">{statusCounts.all}</p>
          </div>
          <button onClick={() => setViewMode('owned')} className={`bg-white rounded-xl shadow-sm p-4 lg:p-6 border-2 transition hover:shadow-md ${viewMode === 'owned' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-xs lg:text-sm font-medium">My Documents</span>
              <span className="text-xl lg:text-2xl">📝</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-blue-600">{statusCounts.owned}</p>
          </button>
          <button onClick={() => setViewMode('received')} className={`bg-white rounded-xl shadow-sm p-4 lg:p-6 border-2 transition hover:shadow-md ${viewMode === 'received' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-xs lg:text-sm font-medium">To Sign</span>
              <span className="text-xl lg:text-2xl">✍️</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-purple-600">{statusCounts.received}</p>
          </button>
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-xs lg:text-sm font-medium">Pending</span>
              <span className="text-xl lg:text-2xl">⏳</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-amber-600">{statusCounts.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-xs lg:text-sm font-medium">Signed</span>
              <span className="text-xl lg:text-2xl">✅</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-emerald-600">{statusCounts.signed}</p>
          </div>
          <button onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')} className={`bg-white rounded-xl shadow-sm p-4 lg:p-6 border-2 transition hover:shadow-md ${statusFilter === 'rejected' ? 'border-rose-500 ring-2 ring-rose-200' : 'border-rose-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-xs lg:text-sm font-medium">Rejected</span>
              <span className="text-xl lg:text-2xl">❌</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-rose-600">{statusCounts.rejected}</p>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-emerald-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
            <button
              onClick={() => { setViewMode('all'); setStatusFilter('all'); setSearchQuery(''); setSortBy('newest'); }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">View</label>
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="w-full px-4 py-2 lg:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm lg:text-base">
                <option value="all">All Documents ({statusCounts.all})</option>
                <option value="owned">My Documents ({statusCounts.owned})</option>
                <option value="received">To Sign ({statusCounts.received})</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <div className="relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents..." className="w-full px-4 py-2 lg:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm lg:text-base" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2 lg:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm lg:text-base">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="signed">Signed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-4 py-2 lg:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm lg:text-base">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {(viewMode !== 'all' || statusFilter !== 'all' || searchQuery || sortBy !== 'newest') && (
            <div className="mt-3 flex flex-wrap gap-2">
              <p className="text-xs text-slate-500">Active filters:</p>
              {viewMode !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                  View: {viewMode === 'owned' ? 'My Documents' : 'To Sign'}
                  <button onClick={() => setViewMode('all')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-semibold">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-amber-900">×</button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-purple-900">×</button>
                </span>
              )}
              {sortBy !== 'newest' && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold">
                  Sort: {sortBy === 'oldest' ? 'Oldest First' : 'Name (A-Z)'}
                  <button onClick={() => setSortBy('newest')} className="hover:text-emerald-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Documents Header */}
        <div className="mb-4 lg:mb-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">
            {viewMode === 'all' && 'All Documents'}
            {viewMode === 'owned' && 'My Documents'}
            {viewMode === 'received' && 'Documents to Sign'}
            {filteredDocuments.length !== allDocuments.length && ` (${filteredDocuments.length})`}
          </h2>
        </div>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 lg:p-12 text-center border border-emerald-100">
            <div className="text-5xl lg:text-6xl mb-4">{allDocuments.length === 0 ? '📄' : '🔍'}</div>
            <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2">{allDocuments.length === 0 ? 'No documents yet' : 'No matching documents'}</h3>
            <p className="text-slate-600 mb-6 text-sm lg:text-base">{allDocuments.length === 0 ? 'Upload your first document to get started' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border overflow-hidden ${doc.status === 'rejected' ? 'border-rose-200' : 'border-emerald-100'}`}
              >
                <div className="p-4 lg:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-2">
                      <h3 className="text-base lg:text-lg font-bold text-slate-800 truncate mb-1">{doc.title}</h3>
                      {!doc.isOwned && (
                        <span className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">Sent to you</span>
                      )}
                    </div>
                    {getStatusBadge(doc)}
                  </div>
                  <p className="text-slate-600 text-xs lg:text-sm mb-1 truncate">{doc.original_filename}</p>
                  <p className="text-slate-500 text-xs mb-3">{new Date(doc.created_at).toLocaleDateString()}</p>

                  {doc.status === 'rejected' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-rose-600 mb-1">❌ Rejection Reason:</p>
                      <p className="text-xs text-slate-700 italic">
                        "{doc.rejectionReason || 'No reason provided'}"
                      </p>
                      {doc.isOwned && doc.rejectedByEmail && (
                        <p className="text-xs text-slate-500 mt-1">Rejected by: {doc.rejectedByEmail}</p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {doc.status === 'signed' ? (
                      <button
                        onClick={async () => {
                          try {
                            let response;
                            if (doc.isOwned) {
                              response = await api.get(`/api/documents/${doc.id}/download-signed`, { responseType: 'blob' });
                            } else {
                              response = await api.get(`/api/documents/public/${doc.signingToken}/download-signed`, { responseType: 'blob' });
                            }
                            const blob = new Blob([response.data], { type: 'application/pdf' });
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `signed_${doc.original_filename}`;
                            link.click();
                            window.URL.revokeObjectURL(url);
                            toast.success('✅ Download started!');
                          } catch (err) {
                            console.error('Download failed:', err);
                            toast.error('❌ Failed to download document');
                          }
                        }}
                        className="flex-1 bg-emerald-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-xs lg:text-sm font-medium"
                      >
                        ⬇ Download
                      </button>
                    ) : doc.status === 'rejected' ? (
                      <>
                        {doc.isOwned && (
                          <button onClick={() => handleDelete(doc.id)} className="w-full bg-rose-100 text-rose-700 px-3 lg:px-4 py-2 rounded-lg hover:bg-rose-200 transition text-xs lg:text-sm font-medium">
                            🗑️ Delete Document
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleSignDocument(doc)} className="flex-1 bg-emerald-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-xs lg:text-sm font-medium">
                          ✍️ Sign
                        </button>
                        {doc.isOwned && (
                          <button onClick={() => navigate(`/send-signing-request/${doc.id}`)} className="flex-1 bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-700 transition text-xs lg:text-sm font-medium">
                            📧 Send
                          </button>
                        )}
                      </>
                    )}
                    {doc.isOwned && doc.status !== 'rejected' && (
                      <button onClick={() => handleDelete(doc.id)} className="bg-rose-100 text-rose-700 px-3 lg:px-4 py-2 rounded-lg hover:bg-rose-200 transition text-xs lg:text-sm font-medium">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;