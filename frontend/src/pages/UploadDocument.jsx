import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getCurrentUser, logout } from '../utils/auth';

function UploadDocument() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError('');

    if (!title) {
      const fileName = selectedFile.name.replace('.pdf', '');
      setTitle(fileName);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a document title');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      console.log('=== UPLOAD DEBUG ===');
      console.log('File:', file);
      console.log('Title:', title);
      console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:8000');
      console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      console.log('===================');

      const response = await api.post('/api/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

    console.log('Upload success:', response.data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Upload failed:', err);
      console.error('Status:', err.response?.status);
      console.error('Data:', err.response?.data);
      console.error('Headers:', err.response?.headers);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
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

            <div className="flex items-center gap-2 lg:gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 lg:gap-2"
              >
                <span className="hidden sm:inline">← Dashboard</span>
                <span className="sm:hidden">← Back</span>
              </button>
              
              {user && (
                <div className="hidden md:flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm lg:text-lg shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500 hidden lg:block">{user.email}</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl hover:from-rose-600 hover:to-rose-700 transition font-semibold shadow-md text-sm lg:text-base"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 border border-emerald-100">
          <h2 className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-slate-700 mb-2">
            📤 Upload Document
          </h2>
          <p className="text-slate-600 mb-6 lg:mb-8 text-sm lg:text-base">Upload a PDF document for digital signing</p>

          <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 lg:p-12 text-center transition-all ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : file 
                  ? 'border-emerald-300 bg-emerald-50' 
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              {!file ? (
                <>
                  <div className="text-5xl lg:text-6xl mb-4">📄</div>
                  <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2">
                    Drag and drop your PDF here
                  </h3>
                  <p className="text-slate-600 mb-4 text-sm lg:text-base">or click to browse</p>
                  <p className="text-slate-500 text-xs lg:text-sm">
                    Maximum file size: 10MB • PDF format only
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="text-5xl lg:text-6xl mb-4">✅</div>
                  <h3 className="text-lg lg:text-xl font-bold text-emerald-700 mb-2">File Selected</h3>
                  <p className="text-slate-700 font-medium mb-1 text-sm lg:text-base">{file.name}</p>
                  <p className="text-slate-500 text-xs lg:text-sm mb-4">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-rose-600 hover:text-rose-700 font-medium text-sm lg:text-base"
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-2">
                Document Title *
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Employment Contract, NDA, Service Agreement"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-base"
              />
              <p className="text-slate-500 text-xs mt-1">
                Give your document a descriptive title
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-slate-200 text-slate-700 py-3 lg:py-3.5 rounded-lg font-semibold hover:bg-slate-300 transition text-base lg:text-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || !title.trim() || uploading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 lg:py-3.5 rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-base lg:text-lg"
              >
                
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  '📤 Upload Document'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UploadDocument;