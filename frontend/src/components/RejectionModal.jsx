import { useState } from 'react';

const REJECTION_REASONS = [
  'I did not authorize this document',
  'The document contains errors',
  'I need more time to review',
  'I disagree with the terms',
  'Wrong person - not intended for me',
  'Other (specify below)',
];

function RejectionModal({ onConfirm, onCancel, documentTitle }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [step, setStep] = useState(1);

  const isOther = selectedReason === 'Other (specify below)';
  const finalReason = isOther ? customReason : selectedReason;
  const canProceed = selectedReason && (!isOther || customReason.trim().length > 5);

  const handleNext = () => {
    if (!canProceed) return;
    setStep(2);
  };

  const handleConfirm = () => {
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
              ❌
            </div>
            <div>
              <h2 className="text-xl font-bold">Reject Document</h2>
              <p className="text-rose-100 text-sm truncate max-w-xs">{documentTitle}</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex items-center gap-1 text-xs font-semibold ${step >= 1 ? 'text-white' : 'text-rose-300'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'}`}>1</div>
              Select Reason
            </div>
            <div className="flex-1 h-px bg-rose-400"></div>
            <div className={`flex items-center gap-1 text-xs font-semibold ${step >= 2 ? 'text-white' : 'text-rose-300'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'}`}>2</div>
              Confirm
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="p-6">
            <p className="text-slate-600 text-sm mb-4">
              Please select a reason for rejecting this document. The document owner will be notified.
            </p>

            <div className="space-y-2 mb-4">
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition font-medium text-sm ${
                    selectedReason === reason
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      selectedReason === reason
                        ? 'border-rose-500 bg-rose-500'
                        : 'border-slate-300'
                    }`}>
                      {selectedReason === reason && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    {reason}
                  </div>
                </button>
              ))}
            </div>

            {isOther && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Please specify your reason:
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter your reason here..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none resize-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {customReason.length}/200 characters (minimum 6)
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-semibold hover:from-rose-700 hover:to-rose-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">⚠️</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Are you sure?</h3>
              <p className="text-slate-600 text-sm">
                This action cannot be undone. The document owner will be notified immediately.
              </p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-2">
                Rejection Reason
              </p>
              <p className="text-slate-800 font-medium text-sm">
                "{finalReason}"
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                What happens next:
              </p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-rose-500">•</span>
                  Document status will change to "Rejected"
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-rose-500">•</span>
                  Document owner will receive an email notification
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-rose-500">•</span>
                  Your signing link will be deactivated
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-semibold hover:from-rose-700 hover:to-rose-800 transition shadow-lg"
              >
                ❌ Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RejectionModal;