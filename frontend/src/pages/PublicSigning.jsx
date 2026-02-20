import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import axios from 'axios';
import SignaturePlacement from '../components/SignaturePlacement';
import SignatureCanvas from '../components/SignatureCanvas';
import SigningPanel from '../components/SigningPanel';
import { SignerProvider } from '../contexts/SignerContext';
import RejectionModal from '../components/RejectionModal';
import FieldLibrary from '../components/FieldLibrary';
import { useToast } from '../contexts/ToastContext';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const isTempId = (id) =>
  typeof id === 'string' && (id.startsWith('temp') || isNaN(Number(id)));

const generateTempId = () =>
  `temp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

function PublicSigning() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [docData, setDocData] = useState(null);
  const [signerEmail, setSignerEmail] = useState('');

  const [mySignerName, setMySignerName] = useState(undefined);

  const [pdfBlob, setPdfBlob] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.2);
  const [signatures, setSignatures] = useState([]);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [currentSignatureToSign, setCurrentSignatureToSign] = useState(null);
  const [signatureType, setSignatureType] = useState('signature');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [signerStatus, setSignerStatus] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showFieldPlacementHelp, setShowFieldPlacementHelp] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [showMobileFields, setShowMobileFields] = useState(false);
  const [existingSignerName, setExistingSignerName] = useState('');
  const [signerNames, setSignerNames] = useState({});
  const mySignerNameRef = useRef('');

  const containerRef = useRef(null);
  const pageRefs = useRef({});

  const publicApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Invalid signing link. Token is missing.');
      setLoading(false);
      return;
    }
    initPage();
    return () => {
      if (pdfBlob) URL.revokeObjectURL(pdfBlob);
    };
  }, [token]);

  const initPage = async () => {
    try {
      setLoading(true);

      let myEmail = '';
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        myEmail = payload.signer_email || '';
      } catch {
      }
      const docResponse = await publicApi.get(`/api/documents/public/${token}`);
      setDocData(docResponse.data.document);
      const emailFromApi = docResponse.data.signer_email || '';
      setSignerEmail(emailFromApi);
      if (!myEmail) myEmail = emailFromApi;
      let resolvedName = '';
      try {
        const signersRes = await publicApi.get(`/api/documents/public/${token}/signers`);
        const mySigner = signersRes.data.find(
          (s) => s.signer_email?.toLowerCase() === myEmail?.toLowerCase()
        );
        setSignerStatus(mySigner?.status || 'pending');

        if (mySigner?.signer_name && mySigner.signer_name.trim()) {
          resolvedName = mySigner.signer_name.trim();
        }
      } catch {
        setSignerStatus('pending');
      }

      if (!resolvedName) {
        const emailPrefix = myEmail.split('@')[0];
        resolvedName = emailPrefix
          .replace(/[._\-]/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }

      const fileResponse = await publicApi.get(`/api/documents/public/${token}/file`, {
        responseType: 'blob',
      });
      const blob = new Blob([fileResponse.data], { type: 'application/pdf' });
      setPdfBlob(URL.createObjectURL(blob));
      try {
        const sigsResponse = await publicApi.get(`/api/signatures/public/${token}`);
        const sigs = sigsResponse.data;
        setSignatures(sigs);
        setRenderKey((prev) => prev + 1);
        setSignerNames(buildSignerNamesMap(sigs, resolvedName));
        const mySignedField = sigs.find(
          (s) =>
            s.status === 'signed' &&
            s.signature_text &&
            (s.signature_type === 'signature' || s.signature_type === 'name') &&
            s.signer_name === resolvedName
        );
        if (mySignedField?.signature_text) {
          setExistingSignerName(mySignedField.signature_text);
        }
      } catch {
      }

      mySignerNameRef.current = resolvedName;
      setMySignerName(resolvedName);
      setError('');
    } catch (err) {
      console.error('Init error:', err);
      setError('Failed to load document. The link may be invalid or expired.');
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const buildSignerNamesMap = (sigs, myName) => {
    const map = {};
    sigs.forEach((s) => {
      if (s.id !== undefined) {
        map[s.id] = s.signer_name || s.signer_email || myName || '';
      }
    });
    return map;
  };

  const fetchSignatures = async () => {
    try {
      const response = await publicApi.get(`/api/signatures/public/${token}`);
      const sigs = response.data;
      setSignatures(sigs);
      setRenderKey((prev) => prev + 1);

      const currentName = mySignerNameRef.current || mySignerName || '';
      setSignerNames(buildSignerNamesMap(sigs, currentName));

      const mySignedField = sigs.find(
        (s) =>
          s.status === 'signed' &&
          s.signature_text &&
          (s.signature_type === 'signature' || s.signature_type === 'name') &&
          s.signer_name === currentName
      );
      if (mySignedField?.signature_text) {
        setExistingSignerName(mySignedField.signature_text);
      }
    } catch (err) {
      console.error('Failed to fetch signatures:', err);
    }
  };

  const handleAddSignature = async (signatureData) => {
    if (!signatureData || signatureData.pageNumber === undefined) return;
    const fieldType = signatureData.type || 'signature';
    const tempId = generateTempId();
    const currentName = mySignerNameRef.current || mySignerName || '';

    const tempSig = {
      id: tempId,
      document_id: null,
      page_number: signatureData.pageNumber,
      x_position: signatureData.x ?? 0.1,
      y_position: signatureData.y ?? 0.1,
      width: signatureData.width || 0.25,
      height: signatureData.height || 0.08,
      signature_type: fieldType,
      status: 'pending',
      created_at: new Date().toISOString(),
      isTemp: true,
      signer_name: currentName,
    };

    setSignatures((prev) => [...prev, tempSig]);
    setSignerNames((prev) => ({ ...prev, [tempId]: currentName }));
    setRenderKey((prev) => prev + 1);

    try {
      await publicApi.post(`/api/signatures/public/${token}`, {
        page_number: signatureData.pageNumber,
        x_position: signatureData.x ?? 0.1,
        y_position: signatureData.y ?? 0.1,
        width: signatureData.width || 0.25,
        height: signatureData.height || 0.08,
        signature_type: fieldType,
      });
      await fetchSignatures();
    } catch (err) {
      console.error('Failed to add signature:', err);
      setSignatures((prev) => prev.filter((sig) => sig.id !== tempId));
      setSignerNames((prev) => { const u = { ...prev }; delete u[tempId]; return u; });
      setRenderKey((prev) => prev + 1);
      toast.error('Failed to add signature placeholder');
    }
  };

  const handleRemoveSignature = async (signatureId) => {
    if (isTempId(signatureId)) {
      setSignatures((prev) => prev.filter((sig) => sig.id !== signatureId));
      setRenderKey((prev) => prev + 1);
      return;
    }
    try {
      setSignatures((prev) => prev.filter((sig) => sig.id !== signatureId));
      setRenderKey((prev) => prev + 1);
      await publicApi.delete(`/api/signatures/public/${token}/${signatureId}`);
    } catch (err) {
      console.error('Failed to remove:', err);
      toast.error('Failed to remove signature');
      await fetchSignatures();
    }
  };

  const handleUpdatePosition = async (signatureId, newX, newY) => {
    if (isTempId(signatureId)) return;
    try {
      await publicApi.put(`/api/signatures/public/${token}/${signatureId}/position`, null, {
        params: { x_position: newX, y_position: newY },
      });
      await fetchSignatures();
    } catch (err) {
      console.error('Failed to update position:', err);
    }
  };

  const handleUpdateSize = async (signatureId, newW, newH, newX, newY) => {
    if (isTempId(signatureId)) return;
    try {
      await publicApi.put(`/api/documents/public/${token}/${signatureId}/size`, null, {
        params: { width: newW, height: newH, x_position: newX, y_position: newY },
      });
      await fetchSignatures();
    } catch (err) {
      console.error('Failed to resize:', err);
    }
  };

  const handleSignSignature = (signature) => {
    setCurrentSignatureToSign(signature);
    setShowSignatureCanvas(true);
  };

  const handleSaveSignature = async (base64Image, signatureText, fontName) => {
    try {
      await publicApi.post(
        `/api/signatures/public/${token}/${currentSignatureToSign.id}/sign`,
        {
          signature_image_base64: base64Image,
          signature_text: signatureText || null,
          signature_font: fontName || 'cursive',
        }
      );
      setShowSignatureCanvas(false);
      if (
        signatureText &&
        (currentSignatureToSign.signature_type === 'signature' ||
          currentSignatureToSign.signature_type === 'name')
      ) {
        setExistingSignerName(signatureText);
      }
      setCurrentSignatureToSign(null);
      toast.success('Signature saved');
      await fetchSignatures();
    } catch (err) {
      console.error('Failed to save signature:', err);
      toast.error('Failed to save signature');
    }
  };

  const handleAddOptionalField = (fieldType) => {
    setSignatureType(fieldType);
    setShowFieldPlacementHelp(true);
    setTimeout(() => setShowFieldPlacementHelp(false), 3000);
  };

  const handleFinalizeDocument = async () => {
    const pendingRequired = signatures.filter(
      (sig) => sig.signature_type === 'signature' && sig.status === 'pending'
    );
    const signedSignatures = signatures.filter((sig) => sig.status === 'signed');
    if (pendingRequired.length > 0) {
      toast.warning(`Please complete ${pendingRequired.length} required signature(s) first.`);
      return;
    }
    if (signedSignatures.length === 0) {
      toast.warning('Please sign at least one signature box before finalizing');
      return;
    }
    if (!window.confirm('Finalize this document? This cannot be undone.')) return;
    setFinalizing(true);
    try {
      const response = await publicApi.post(`/api/documents/public/${token}/finalize`);
      setSignerStatus('signed');
      if (response.data.all_signed) {
        toast.success('Document signed! The owner will be notified.');
        setDocData((prev) => ({ ...prev, status: 'signed' }));
      } else {
        toast.success(`Signature recorded! ${response.data.pending_count} signer(s) still pending.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to finalize document');
    } finally {
      setFinalizing(false);
    }
  };

  const handleRejectDocument = async (reason) => {
    setRejecting(true);
    setShowRejectionModal(false);
    try {
      await publicApi.post(`/api/documents/public/${token}/reject`, { reason });
      toast.success('Document rejected. Owner notified.');
      setSignerStatus('rejected');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const zoomIn = () => setScale((p) => Math.min(p + 0.2, 3.0));
  const zoomOut = () => setScale((p) => Math.max(p - 0.2, 0.5));
  const resetZoom = () => setScale(1.2);

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-white font-medium text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full text-center border border-rose-200">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6 text-sm">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition text-sm">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  if (signerStatus === 'signed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full text-center border border-emerald-200">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-emerald-700 mb-2">Already Signed!</h2>
          <p className="text-slate-600 text-sm">You have already signed this document.</p>
        </div>
      </div>
    );
  }

  if (signerStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full text-center border border-rose-200">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-rose-700 mb-2">Document Rejected</h2>
          <p className="text-slate-600 text-sm">You rejected this document. The owner has been notified.</p>
        </div>
      </div>
    );
  }
  if (mySignerName === undefined) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-white font-medium text-sm">Preparing your signing session...</p>
        </div>
      </div>
    );
  }
  const signerInitialName = existingSignerName || mySignerName;

  return (
    <SignerProvider initialName={signerInitialName}>
      <div className={`h-screen flex ${isMobile ? 'flex-col' : 'flex-row'} bg-slate-100 overflow-hidden`}>

        {!isMobile && !previewMode && (
          <div className="w-52 xl:w-64 bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0 flex flex-col">
            <div className="p-3 xl:p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-emerald-700 flex-shrink-0">
              <h2 className="text-white font-bold text-sm xl:text-lg">📚 Fields</h2>
              <p className="text-emerald-100 text-xs hidden xl:block">Drag fields to document</p>
            </div>
            <div className="p-3 xl:p-4 flex-1 overflow-y-auto">
              <FieldLibrary onAddField={handleAddOptionalField} disabled={false} />
            </div>
          </div>
        )}

        <div className={`${isMobile ? 'flex-1 overflow-hidden' : 'flex-1 min-w-0'} flex flex-col`}>

          <div className="bg-white border-b border-slate-200 px-3 xl:px-6 py-2 xl:py-3 flex-shrink-0">
            <div className="flex items-center gap-2 xl:gap-3 flex-wrap">

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="border-l border-slate-300 h-5 hidden sm:block flex-shrink-0"></span>
                <div className="min-w-0">
                  <h2 className="text-xs xl:text-base font-bold text-slate-800 truncate">{docData?.title}</h2>
                  <p className="text-emerald-600 text-xs font-medium truncate">Signing as: {signerEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={zoomOut} disabled={scale <= 0.5} className="px-2 py-1 xl:px-3 xl:py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-30 font-bold text-sm">−</button>
                <button onClick={resetZoom} className="px-2 py-1 xl:px-3 xl:py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium text-xs min-w-[44px] xl:min-w-[60px] text-center">{Math.round(scale * 100)}%</button>
                <button onClick={zoomIn} disabled={scale >= 3.0} className="px-2 py-1 xl:px-3 xl:py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-30 font-bold text-sm">+</button>
              </div>

              <div className="flex items-center gap-1 xl:gap-2 flex-shrink-0">
                <span className="hidden sm:inline bg-amber-100 text-amber-700 px-2 py-0.5 xl:py-1 rounded-full font-semibold text-xs">
                  {signatures.filter((s) => s.status === 'pending').length} Pending
                </span>
                <span className="hidden sm:inline bg-emerald-100 text-emerald-700 px-2 py-0.5 xl:py-1 rounded-full font-semibold text-xs">
                  {signatures.filter((s) => s.status === 'signed').length} Signed
                </span>
                {isMobile && !previewMode && (
                  <button onClick={() => setShowMobileFields(true)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow transition">📚 Fields</button>
                )}
                {signatures.filter((s) => s.status === 'signed').length > 0 && !isMobile && (
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className={`px-2 xl:px-3 py-0.5 xl:py-1 rounded-full font-semibold text-xs transition ${
                      previewMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {previewMode ? '✏️ Edit' : '👁️ Preview'}
                  </button>
                )}
              </div>

            </div>
          </div>

          {isMobile && (
            <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold text-xs">
                {signatures.filter((s) => s.status === 'pending').length} Pending
              </span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold text-xs">
                {signatures.filter((s) => s.status === 'signed').length} Signed
              </span>
              {signatures.filter((s) => s.status === 'signed').length > 0 && (
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`px-2 py-0.5 rounded-full font-semibold text-xs transition ${
                    previewMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {previewMode ? '✏️ Edit' : '👁️ Preview'}
                </button>
              )}
            </div>
          )}

          {showFieldPlacementHelp && (
            <div className="bg-blue-600 text-white px-3 xl:px-4 py-2 xl:py-3 flex items-center justify-between flex-shrink-0">
              <span className="font-semibold text-sm xl:text-base">{isMobile ? `Click & drag to place ${signatureType}` : `Drag ${signatureType} field from left panel`}</span>
              <button onClick={() => setShowFieldPlacementHelp(false)} className="ml-2 text-white hover:text-blue-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div ref={containerRef} className="flex-1 overflow-auto bg-slate-100" style={isMobile ? { paddingBottom: '260px' } : {}}>
            <div className="flex flex-col items-center py-4 xl:py-8 gap-4 xl:gap-6">
              <Document file={pdfBlob} onLoadSuccess={onDocumentLoadSuccess}>
                {numPages && Array.from(new Array(numPages), (_, index) => {
                  const pageNum = index + 1;
                  return (
                    <div key={`page_${pageNum}`} ref={(el) => (pageRefs.current[pageNum] = el)} className="mb-4 xl:mb-6 relative px-2 xl:px-4">
                      <div className="relative inline-block shadow-2xl">
                        <Page pageNumber={pageNum} scale={isMobile ? Math.min(scale, 0.9) : scale} className="bg-white" />
                        <SignaturePlacement
                          key={`placement-${pageNum}-${renderKey}`}
                          pageNumber={pageNum}
                          signatures={signatures}
                          onAddSignature={previewMode ? () => {} : handleAddSignature}
                          onRemoveSignature={previewMode ? () => {} : handleRemoveSignature}
                          onUpdatePosition={previewMode ? () => {} : handleUpdatePosition}
                          onUpdateSize={previewMode ? () => {} : handleUpdateSize}
                          onSignClick={previewMode ? () => {} : handleSignSignature}
                          signatureType={signatureType}
                          enableDragAndDrop={!isMobile && !previewMode}
                          isPreviewMode={previewMode}
                          documentStatus={docData?.status}
                          signerNames={signerNames}
                          currentSignerName={mySignerName}
                        />
                      </div>
                      <div className="text-center mt-2 xl:mt-3">
                        <span className="inline-block bg-slate-700 text-white px-3 xl:px-4 py-1 xl:py-1.5 rounded-full text-xs xl:text-sm font-semibold">Page {pageNum}</span>
                      </div>
                    </div>
                  );
                })}
              </Document>
            </div>
          </div>
        </div>

        {isMobile && showMobileFields && !previewMode && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end" onClick={() => setShowMobileFields(false)}>
            <div className="bg-white rounded-t-2xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-base">📚 Add Field</h3>
                <button onClick={() => setShowMobileFields(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
              </div>
              <FieldLibrary onAddField={(type) => { handleAddOptionalField(type); setShowMobileFields(false); }} disabled={false} />
            </div>
          </div>
        )}

        <SigningPanel
          signatures={signatures}
          onSignClick={previewMode ? () => {} : handleSignSignature}
          onFinalize={handleFinalizeDocument}
          onReject={() => setShowRejectionModal(true)}
          onAddOptionalField={handleAddOptionalField}
          isMobile={isMobile}
          isPreviewMode={previewMode}
          isRejecting={rejecting}
          signerNames={signerNames}
          currentSignerName={mySignerName}
        />

        {showSignatureCanvas && (
          <SignatureCanvas
            onSave={handleSaveSignature}
            onCancel={() => { setShowSignatureCanvas(false); setCurrentSignatureToSign(null); }}
            signatureType={currentSignatureToSign?.signature_type || 'signature'}
          />
        )}

        {showRejectionModal && (
          <RejectionModal
            documentTitle={docData?.title}
            onConfirm={handleRejectDocument}
            onCancel={() => setShowRejectionModal(false)}
          />
        )}
      </div>
    </SignerProvider>
  );
}

export default PublicSigning;