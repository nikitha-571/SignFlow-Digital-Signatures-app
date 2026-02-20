import { useNavigate } from 'react-router-dom';

function SigningComplete() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center border border-emerald-100">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-emerald-100 rounded-full mb-4 animate-bounce">
            <svg className="w-16 h-16 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 mb-4">
          🎉 Document Signed Successfully!
        </h1>
        
        <p className="text-slate-600 text-lg mb-8">
          Thank you for signing the document. The document owner has been notified.
        </p>

        <div className="text-slate-500 text-sm mb-8">
          <p>You can now safely close this window.</p>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <p className="text-slate-400 text-sm mb-2">Powered by</p>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-slate-700">
            ✍️ SignFlow
          </h2>
          <p className="text-slate-500 text-xs mt-2">Secure Digital Signatures</p>
        </div>
      </div>
    </div>
  );
}

export default SigningComplete;