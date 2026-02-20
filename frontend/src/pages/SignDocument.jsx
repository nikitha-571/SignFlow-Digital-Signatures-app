import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import api from '../utils/api';
import { getCurrentUser } from '../utils/auth';
import SignaturePlacement from '../components/SignaturePlacement';
import SignatureCanvas from '../components/SignatureCanvas';
import SigningPanel from '../components/SigningPanel';
import { SignerProvider } from '../contexts/SignerContext';
import FieldLibrary from '../components/FieldLibrary';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const isTempId = (id) => {
  if (id === null || id === undefined) return true;
  const s = String(id);
  return s.startsWith('temp_') || s.startsWith('temp-');
};

const generateTempId = () =>
  `temp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

function SignDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [document, setDocument] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.2);
  const [signatures, setSignatures] = useState([]);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [currentSignatureToSign, setCurrentSignatureToSign] = useState(null);
  const [signatureType, setSignatureType] = useState('signature');
  const [finalizing, setFinalizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showFieldPlacementHelp, setShowFieldPlacementHelp] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [showMobileFields, setShowMobileFields] = useState(false);
  const [existingSignerName, setExistingSignerName] = useState('');
  const [signerNames, setSignerNames] = useState({});

  const currentUserRef = useRef(null);

  const containerRef = useRef(null);
  const pageRefs = useRef({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    currentUserRef.current = currentUser;
    fetchDocument();
    fetchSignatures(currentUser);

    return () => {
      if (pdfBlob) URL.revokeObjectURL(pdfBlob);
    };
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await api.get(`/api/documents/${id}`);
      setDocument(response.data);

      const fileResponse = await api.get(`/api/documents/${id}/file`, {
        responseType: 'blob',
      });
      const blob = new Blob([fileResponse.data], { type: 'application/pdf' });
      setPdfBlob(URL.createObjectURL(blob));
    } catch (err) {
      console.error('❌ Failed to load document:', err);
      alert('Failed to load document: ' + (err.response?.data?.detail || err.message));
      navigate('/dashboard');
    }
  };

  const fetchSignatures = async (currentUser) => {
    const cu = currentUser || currentUserRef.current;
    try {
      const response = await api.get(`/api/signatures/document/${id}`);
      const sigs = response.data;
      setSignatures(sigs);
      setRenderKey((prev) => prev + 1);

      const namesMap = {};
      sigs.forEach((s) => {
        if (s.id !== undefined) {
          const name =
            s.signer_name ||
            s.signer_email ||
            (s.signer_id === cu?.id ? cu?.name : null) ||
            null;
          namesMap[s.id] = name;
        }
      });
      setSignerNames(namesMap);
      const signedWithText = sigs.find(
        (s) =>
          s.status === 'signed' &&
          s.signature_text &&
          (s.signature_type === 'signature' || s.signature_type === 'name')
      );
      if (signedWithText?.signature_text) {
        setExistingSignerName(signedWithText.signature_text);
      }
    } catch (err) {
      console.error('Failed to fetch signatures:', err);
    }
  };

  const handleAddSignature = async (signatureData) => {
    if (!signatureData || signatureData.pageNumber === undefined) return;
    const fieldType = signatureData.type || 'signature';
    const tempId = generateTempId();
    const cu = currentUserRef.current;

    const tempSignature = {
      id: tempId,
      document_id: parseInt(id),
      page_number: signatureData.pageNumber,
      x_position: signatureData.x ?? 0.1,
      y_position: signatureData.y ?? 0.1,
      width: signatureData.width || 0.25,
      height: signatureData.height || 0.08,
      signature_type: fieldType,
      status: 'pending',
      created_at: new Date().toISOString(),
      isTemp: true,
    };

    setSignatures((prev) => [...prev, tempSignature]);
    setSignerNames((prev) => ({ ...prev, [tempId]: cu?.name || '' }));
    setRenderKey((prev) => prev + 1);

    try {
      await api.post('/api/signatures/', {
        document_id: parseInt(id),
        page_number: signatureData.pageNumber,
        x_position: signatureData.x ?? 0.1,
        y_position: signatureData.y ?? 0.1,
        width: signatureData.width || 0.25,
        height: signatureData.height || 0.08,
        signature_type: fieldType,
      });
      await fetchSignatures();
    } catch (err) {
      console.error('❌ Failed to add signature:', err);
      setSignatures((prev) => prev.filter((sig) => sig.id !== tempId));
      setSignerNames((prev) => { const u = { ...prev }; delete u[tempId]; return u; });
      setRenderKey((prev) => prev + 1);
      alert('Failed to add signature placeholder');
    }
  };

  const handleUpdatePosition = async (signatureId, newX, newY) => {
    if (isTempId(signatureId)) return;
    try {
      setSignatures((prev) =>
        prev.map((sig) =>
          sig.id === signatureId ? { ...sig, x_position: newX, y_position: newY } : sig
        )
      );
      await api.put(`/api/signatures/${signatureId}/position`, null, {
        params: { x_position: newX, y_position: newY },
      });
    } catch (err) {
      console.error('❌ Failed to update position:', err);
      await fetchSignatures();
    }
  };

  const handleUpdateSize = async (signatureId, newW, newH, newX, newY) => {
    if (isTempId(signatureId)) return;
    try {
      setSignatures((prev) =>
        prev.map((sig) =>
          sig.id === signatureId
            ? { ...sig, width: newW, height: newH, x_position: newX, y_position: newY }
            : sig
        )
      );
      await api.put(`/api/signatures/${signatureId}/size`, null, {
        params: { width: newW, height: newH, x_position: newX, y_position: newY },
      });
    } catch (err) {
      console.error('❌ Failed to update size:', err);
      await fetchSignatures();
    }
  };

  const handleRemoveSignature = async (signatureId) => {
    if (isTempId(signatureId)) {
      setSignatures((prev) => prev.filter((sig) => sig.id !== signatureId));
      setSignerNames((prev) => { const u = { ...prev }; delete u[signatureId]; return u; });
      setRenderKey((prev) => prev + 1);
      return;
    }
    try {
      setSignatures((prev) => prev.filter((sig) => sig.id !== signatureId));
      setRenderKey((prev) => prev + 1);
      await api.delete(`/api/signatures/${signatureId}`);
    } catch (err) {
      console.error('❌ Failed to remove signature:', err);
      await fetchSignatures();
    }
  };

  const handleSignSignature = (signature) => {
    setCurrentSignatureToSign(signature);
    setShowSignatureCanvas(true);
  };

  const handleSaveSignature = async (base64Image, signatureText, fontName) => {
    const sigId = currentSignatureToSign.id;
    const sigType = currentSignatureToSign.signature_type;

    if (isTempId(sigId)) {
      alert('This field is still saving — please wait a moment and try again.');
      return;
    }

    try {
      setSignatures((prev) =>
        prev.map((sig) =>
          sig.id === sigId
            ? {
                ...sig,
                status: 'signed',
                signature_text: signatureText,
                signature_image_path: base64Image ? 'temp-image' : null,
                signature_font: fontName,
                signed_at: new Date().toISOString(),
              }
            : sig
        )
      );
      setRenderKey((prev) => prev + 1);
      setShowSignatureCanvas(false);
      setCurrentSignatureToSign(null);

      if (signatureText && (sigType === 'signature' || sigType === 'name')) {
        setExistingSignerName(signatureText);
      }

      await api.post(`/api/signatures/${sigId}/sign`, {
        signature_image_base64: base64Image,
        signature_text: signatureText || null,
        signature_font: fontName || 'cursive',
      });

      await fetchSignatures();
    } catch (err) {
      console.error('❌ Failed to save signature:', err);
      await fetchSignatures();
      alert('Failed to save signature: ' + (err.response?.data?.detail || err.message));
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
      alert(`Please complete ${pendingRequired.length} required signature(s) before finalizing.`);
      return;
    }
    if (signedSignatures.length === 0) {
      alert('Please sign at least one signature box before finalizing');
      return;
    }
    if (!window.confirm('Finalize this document? This action cannot be undone.')) return;

    setFinalizing(true);
    try {
      await api.post(`/api/documents/${id}/finalize`);
      alert('✅ Document finalized successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Failed to finalize:', err);
      alert(err.response?.data?.detail || 'Failed to finalize document');
    } finally {
      setFinalizing(false);
    }
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1.2);


  const signerInitialName = existingSignerName || user?.name || '';

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
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-shrink-0 flex items-center gap-1 text-slate-600 hover:text-slate-800 transition text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xs xl:text-base font-bold text-slate-800 truncate">
                    {document?.title || 'Loading...'}
                  </h1>
                  {user && (
                    <p className="text-emerald-600 text-xs font-medium truncate">
                      Signing as: {user.name} ({user.email})
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={zoomOut} disabled={scale <= 0.5} className="px-2 py-1 xl:px-3 xl:py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-30 font-bold text-sm">−</button>
                <button onClick={resetZoom} className="px-2 py-1 xl:px-3 xl:py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium text-xs min-w-[44px] text-center">{Math.round(scale * 100)}%</button>
                <button onClick={zoomIn} disabled={scale >= 3.0} className="px-2 py-1 xl:px-3 xl:py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-30 font-bold text-sm">+</button>
              </div>

              <div className="flex items-center gap-1 xl:gap-2">
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 xl:py-1 rounded-full font-semibold text-xs">
                  {signatures.filter((s) => s.status === 'pending').length} Pending
                </span>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 xl:py-1 rounded-full font-semibold text-xs">
                  {signatures.filter((s) => s.status === 'signed').length} Signed
                </span>
                {isMobile && !previewMode && (
                  <button onClick={() => setShowMobileFields(true)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow transition">
                    📚 Fields
                  </button>
                )}
                {!isMobile && signatures.filter((s) => s.status === 'signed').length > 0 && (
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

          {showFieldPlacementHelp && (
            <div className="bg-blue-600 text-white px-3 xl:px-4 py-2 xl:py-3 flex items-center justify-between flex-shrink-0">
              <span className="font-semibold text-sm xl:text-base">
                {isMobile ? `Click & drag to place ${signatureType}` : `Drag ${signatureType} field from left panel`}
              </span>
              <button onClick={() => setShowFieldPlacementHelp(false)} className="ml-2 text-white hover:text-blue-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div ref={containerRef} className="flex-1 overflow-auto bg-slate-100" style={isMobile ? { paddingBottom: '260px' } : {}}>
            <div className="flex flex-col items-center py-4 xl:py-8 gap-4 xl:gap-6">
              {pdfBlob && (
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
                            documentStatus={document?.status}
                            signerNames={signerNames}
                            currentSignerName={user?.name || ''}
                          />
                        </div>
                        <div className="text-center mt-2 xl:mt-3">
                          <span className="inline-block bg-slate-700 text-white px-3 xl:px-4 py-1 xl:py-1.5 rounded-full text-xs xl:text-sm font-semibold">
                            Page {pageNum}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </Document>
              )}
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
          onAddOptionalField={handleAddOptionalField}
          isMobile={isMobile}
          isPreviewMode={previewMode}
          signerNames={signerNames}  
          currentSignerName={user?.name || ''}
        />

        {showSignatureCanvas && (
          <SignatureCanvas
            onSave={handleSaveSignature}
            onCancel={() => { setShowSignatureCanvas(false); setCurrentSignatureToSign(null); }}
            signatureType={currentSignatureToSign?.signature_type || 'signature'}
          />
        )}
      </div>
    </SignerProvider>
  );
}

export default SignDocument;