function SigningPanel({ 
  signatures, 
  onSignClick, 
  onFinalize,
  onReject,
  onAddOptionalField,
  isMobile,
  isPreviewMode = false,
  isRejecting = false,
  signerNames = {},
  currentSignerName = '',
}) {
  const requiredSignatures = signatures.filter(
    sig => sig.signature_type === 'signature' && sig.status === 'pending'
  );

  const optionalSignatures = signatures.filter(
    sig => sig.signature_type !== 'signature' && sig.status === 'pending'
  );

  const completedSignatures = signatures.filter(
    sig => sig.status === 'signed'
  );

  const getSignerLabel = (sig) => {
    const name = signerNames[sig.id] || sig.signer_name || sig.signer_email || null;
    if (!name) return null;
    return name.length > 20 ? name.slice(0, 18) + '…' : name;
  };
  const isMine = (sig) => {
    const name = signerNames[sig.id] || sig.signer_name || '';
    return currentSignerName && name === currentSignerName;
  };

  const fieldConfig = {
    initials: { icon: '🔤', label: 'Initials',   color: 'from-blue-50 to-indigo-50',   borderColor: 'border-blue-200',   bgColor: 'from-blue-600 to-blue-700'   },
    name:     { icon: '👤', label: 'Full Name',   color: 'from-purple-50 to-pink-50',   borderColor: 'border-purple-200', bgColor: 'from-purple-600 to-purple-700' },
    date:     { icon: '📅', label: 'Date',        color: 'from-amber-50 to-yellow-50',  borderColor: 'border-amber-200',  bgColor: 'from-amber-600 to-amber-700'  },
    text:     { icon: '📝', label: 'Text',        color: 'from-slate-50 to-gray-50',    borderColor: 'border-slate-200',  bgColor: 'from-slate-600 to-slate-700'  },
  };

  const getLabel = (type) => ({
    signature: 'Signature', initials: 'Initials', name: 'Full Name', date: 'Date', text: 'Text'
  }[type] || 'Field');

  const getIcon = (type) => ({
    signature: '✍️', initials: '🔤', name: '👤', date: '📅', text: '📝'
  }[type] || '📝');

  return (
    <div className={`${
      isMobile
        ? 'fixed bottom-0 left-0 right-0 bg-white border-t-2 border-emerald-500 shadow-2xl max-h-[50vh] overflow-y-auto'
        : 'w-80 lg:w-96 bg-white border-l border-slate-200 overflow-y-auto flex-shrink-0'
    }`}>

      {/* Header */}
      <div className={`sticky top-0 ${
        isPreviewMode
          ? 'bg-gradient-to-r from-blue-600 to-blue-700'
          : 'bg-gradient-to-r from-emerald-600 to-emerald-700'
      } text-white p-4 lg:p-6 z-10`}>
        <h2 className="text-xl lg:text-2xl font-bold mb-1">
          {isPreviewMode ? '👁️ Preview Mode' : 'Signing Options'}
        </h2>
        <p className={`${isPreviewMode ? 'text-blue-100' : 'text-emerald-100'} text-xs lg:text-sm`}>
          {isPreviewMode ? 'View only — click Edit to make changes' : 'Complete all required fields'}
        </p>
      </div>

      {/* Preview Mode */}
      {isPreviewMode ? (
        <div className="p-6 lg:p-8 space-y-6">
          <div className="text-center">
            <p className="text-slate-600 mb-4">This is how your document will look after finalizing.</p>
            <p className="text-sm text-slate-500">Click the <strong>"Edit"</strong> button to return to signing mode.</p>
          </div>
          {signatures.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700 font-semibold text-sm">Completion Status</span>
                <span className="text-slate-800 font-bold">{completedSignatures.length} / {signatures.length}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${signatures.length > 0 ? (completedSignatures.length / signatures.length) * 100 : 0}%` }}
                />
              </div>
              {requiredSignatures.length === 0 && completedSignatures.length > 0 && (
                <p className="text-emerald-600 text-sm font-semibold mt-2 text-center">✓ Ready to finalize</p>
              )}
            </div>
          )}
        </div>
      ) : (

        <div className="p-4 lg:p-6 space-y-6">

          {/* Required Signatures */}
          {requiredSignatures.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm lg:text-base">Required Fields</h3>
                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-xs font-semibold">
                  {requiredSignatures.length}
                </span>
              </div>
              <div className="space-y-3">
                {requiredSignatures.map((sig) => {
                  const signerLabel = getSignerLabel(sig);
                  const mine = isMine(sig);
                  return (
                    <div
                      key={`required-${sig.id}`}
                      className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border-2 border-rose-200 shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          ✍️
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm">Signature</h4>
                          <p className="text-rose-600 text-xs">Page {sig.page_number}</p>
                        </div>
                      </div>

                      {signerLabel && (
                        <div className={`flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold w-fit max-w-full ${
                          mine
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span>👤</span>
                          <span className="truncate">{signerLabel}</span>
                          {mine && <span className="text-emerald-500 ml-1 flex-shrink-0">(You)</span>}
                        </div>
                      )}

                      <button
                        onClick={() => onSignClick(sig)}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2.5 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition font-semibold shadow-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Sign
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Fields */}
          {optionalSignatures.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm lg:text-base">Optional Fields</h3>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                  {optionalSignatures.length}
                </span>
              </div>
              <div className="space-y-3">
                {optionalSignatures.map((sig) => {
                  const config = fieldConfig[sig.signature_type] || fieldConfig.text;
                  const signerLabel = getSignerLabel(sig);
                  const mine = isMine(sig);
                  return (
                    <div
                      key={`optional-${sig.id}`}
                      className={`bg-gradient-to-br ${config.color} rounded-xl p-4 border-2 ${config.borderColor} shadow-sm`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${config.bgColor} rounded-full flex items-center justify-center text-white font-bold shadow-md text-lg`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm">{config.label}</h4>
                          <p className="text-slate-600 text-xs">Page {sig.page_number}</p>
                        </div>
                      </div>
                      {signerLabel && (
                        <div className={`flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold w-fit max-w-full ${
                          mine
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span>👤</span>
                          <span className="truncate">{signerLabel}</span>
                          {mine && <span className="text-emerald-500 ml-1 flex-shrink-0">(You)</span>}
                        </div>
                      )}

                      <button
                        onClick={() => onSignClick(sig)}
                        className={`w-full bg-gradient-to-r ${config.bgColor} text-white py-2.5 rounded-lg hover:opacity-90 transition font-semibold shadow-md flex items-center justify-center gap-2`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Fill
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {completedSignatures.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm lg:text-base">Completed</h3>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold">
                  {completedSignatures.length}
                </span>
              </div>
              <div className="space-y-2">
                {completedSignatures.map((sig) => {
                  const signerLabel = getSignerLabel(sig);
                  const mine = isMine(sig);
                  return (
                    <div
                      key={`completed-${sig.id}`}
                      className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 flex items-center gap-2"
                    >
                      <div className="bg-emerald-500 text-white rounded-full p-1 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-slate-800 text-sm font-semibold">{getLabel(sig.signature_type)}</p>
                          {signerLabel && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                              mine
                                ? 'bg-emerald-200 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              👤 {signerLabel}{mine && ' (You)'}
                            </span>
                          )}
                        </div>
                        <p className="text-emerald-600 text-xs">Page {sig.page_number}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {signatures.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700 font-semibold text-sm">Progress</span>
                <span className="text-slate-800 font-bold">{completedSignatures.length} / {signatures.length}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${signatures.length > 0 ? (completedSignatures.length / signatures.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Reject Button */}
          {onReject && (
            <button
              onClick={onReject}
              disabled={isRejecting}
              className="w-full py-3 lg:py-4 rounded-xl font-bold text-base lg:text-lg transition border-2 border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
            >
              {isRejecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin"></div>
                  <span>Rejecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Reject Document
                </>
              )}
            </button>
          )}

          {/* Finalize Button */}
          <button
            onClick={onFinalize}
            disabled={requiredSignatures.length > 0}
            className={`w-full py-3 lg:py-4 rounded-xl font-bold text-base lg:text-lg shadow-lg transition ${
              requiredSignatures.length > 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl'
            }`}
          >
            {requiredSignatures.length > 0
              ? `Complete ${requiredSignatures.length} Required Field${requiredSignatures.length !== 1 ? 's' : ''}`
              : '✅ Finalize Document'}
          </button>

        </div>
      )}
    </div>
  );
}

export default SigningPanel;