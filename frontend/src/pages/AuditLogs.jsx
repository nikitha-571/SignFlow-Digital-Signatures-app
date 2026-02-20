import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getCurrentUser, logout } from '../utils/auth';

function AuditLogs() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    days: 7,
    action: ''
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
    }
    fetchAuditLogs();
    fetchSummary();
  }, [filter]);

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/api/audit-logs/', {
        params: {
          days: filter.days,
          action: filter.action || undefined,
          limit: 100
        }
      });
      setLogs(response.data.logs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/api/audit-logs/summary', {
        params: { days: filter.days }
      });
      setSummary(response.data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getActionIcon = (action) => {
    const icons = {
      'USER_LOGIN': '🔐',
      'USER_REGISTERED': '👤',
      'DOCUMENT_UPLOADED': '📤',
      'DOCUMENT_VIEWED': '👁️',
      'DOCUMENT_DOWNLOADED': '⬇️',
      'DOCUMENT_DELETED': '🗑️',
      'DOCUMENT_FINALIZED': '✅',
      'SIGNATURE_CREATED': '📝',
      'SIGNATURE_SIGNED': '✍️',
      'SIGNATURE_DELETED': '❌',
      'SIGNING_REQUEST_SENT': '📧',
      'PUBLIC_DOCUMENT_ACCESSED': '🔓',
      'PUBLIC_SIGNATURE_ADDED': '🌐'
    };
    return icons[action] || '📋';
  };

  const getActionColor = (action) => {
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    if (action.includes('SIGNED') || action.includes('FINALIZED')) return 'text-emerald-600 bg-emerald-50';
    if (action.includes('UPLOAD') || action.includes('CREATE')) return 'text-blue-600 bg-blue-50';
    if (action.includes('VIEW') || action.includes('ACCESS')) return 'text-purple-600 bg-purple-50';
    return 'text-slate-600 bg-slate-50';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-slate-700">
                ✍️ SignFlow
              </h1>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition"
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-slate-700 mb-2">
            📊 Audit Logs
          </h2>
          <p className="text-slate-600">Complete activity history and security audit trail</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Total Activities</span>
                <span className="text-2xl">📈</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{summary.total_activities}</p>
              <p className="text-slate-500 text-xs mt-1">Last {filter.days} days</p>
            </div>

            {Object.entries(summary.action_breakdown).slice(0, 3).map(([action, count], index) => (
              <div key={action} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600 text-sm font-medium truncate">
                    {action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-2xl">{getActionIcon(action)}</span>
                </div>
                <p className="text-3xl font-bold text-slate-800">{count}</p>
                <p className="text-slate-500 text-xs mt-1">activities</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Time Period</label>
              <select
                value={filter.days}
                onChange={(e) => setFilter({ ...filter, days: parseInt(e.target.value) })}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Action Type</label>
              <select
                value={filter.action}
                onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">All Actions</option>
                <option value="USER_LOGIN">Login</option>
                <option value="DOCUMENT_UPLOADED">Upload</option>
                <option value="DOCUMENT_VIEWED">View</option>
                <option value="SIGNATURE_SIGNED">Signed</option>
                <option value="DOCUMENT_FINALIZED">Finalized</option>
              </select>
            </div>

            <div className="flex-1"></div>

            <div className="flex items-end">
              <button
                onClick={() => setFilter({ days: 7, action: '' })}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-600 font-medium mb-2">No audit logs found</p>
              <p className="text-slate-500 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getActionColor(log.action)}`}>
                          <span>{getActionIcon(log.action)}</span>
                          <span>{log.action.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-800">{log.description}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-slate-600 font-mono">{log.ip_address || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-slate-600">{formatDate(log.created_at)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Export Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => alert('Export functionality coming soon!')}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition font-semibold shadow-md"
          >
            📥 Export Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditLogs;