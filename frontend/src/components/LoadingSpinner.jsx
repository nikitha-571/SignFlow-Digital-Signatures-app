function LoadingSpinner({ size = 'md', message = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin`}></div>
      {message && <p className="text-slate-600 text-sm font-medium">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-slate-800 font-semibold text-lg">{message}</p>
      </div>
    </div>
  );
}