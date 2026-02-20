import { useRef, useState, useEffect, useMemo } from 'react';
import { useSignerContext } from '../contexts/SignerContext';
import { useToast } from '../contexts/ToastContext';

function SignatureCanvas({ onSave, onCancel, signatureType = 'signature' }) {
  const canvasRef  = useRef(null);
  const toast      = useToast();
  const [signatureMode, setSignatureMode] = useState(
    signatureType === 'signature' ? 'draw' : 'type'
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn]   = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [selectedFont, setSelectedFont]   = useState('Dancing Script');

  const { signerName, setSignerName, signerInitials, currentDate } = useSignerContext();

  const fonts = useMemo(() => [
    { name: 'Dancing Script', label: 'Dancing Script' },
    { name: 'Pacifico',       label: 'Pacifico'       },
    { name: 'Great Vibes',    label: 'Great Vibes'    },
    { name: 'Satisfy',        label: 'Satisfy'        },
    { name: 'Allura',         label: 'Allura'         },
    { name: 'Alex Brush',     label: 'Alex Brush'     },
    { name: 'cursive',        label: 'Default Cursive'},
  ], []);

  useEffect(() => {
    switch (signatureType) {
      case 'signature':
        setSignatureText(signerName || '');
        break;
      case 'initials':
        setSignatureText(signerInitials || '');
        break;
      case 'name':
        setSignatureText(signerName || '');
        break;
      case 'date':
        setSignatureText(currentDate);
        break;
      case 'text':
        break;
      default:
        break;
    }
  }, [signatureType, signerInitials, signerName, currentDate]);

  const getPlaceholder = () => ({
    signature: 'Your Full Name',
    initials:  'Auto-generated from name',
    name:      'Your Full Name',
    date:      'Auto-filled',
    text:      'Enter custom text',
  }[signatureType] ?? 'Your Signature');

  const getModalTitle = () => ({
    signature: 'Create Your Signature',
    initials:  'Your Initials',
    name:      'Your Full Name',
    date:      'Date',
    text:      'Enter Text',
  }[signatureType] ?? 'Create Your Signature');

  const getFieldDescription = () => ({
    signature: 'Draw or type your signature',
    initials:  `Auto-generated from: "${signerName || 'sign first to set name'}"`,
    name:      'Your full legal name',
    date:      "Today's date (auto-filled)",
    text:      'Enter any custom text',
  }[signatureType] ?? '');

  useEffect(() => {
    if (signatureMode === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
    }
  }, [signatureMode]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e) => {
    e?.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvasRef.current.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const generateTextSignature = () => {
    if (!signatureText.trim()) {
      toast.error('Please enter text first');
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width  = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';

    const fontSize =
      signatureType === 'initials' ? 80 :
      signatureType === 'date' || signatureType === 'text' ? 48 : 60;
    const fontStyle  = signatureType === 'signature' ? 'italic' : 'normal';
    const fontFamily = signatureType === 'signature' ? selectedFont : 'Arial';

    ctx.font         = `${fontStyle} ${fontSize}px "${fontFamily}", ${signatureType === 'signature' ? 'cursive' : 'sans-serif'}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(signatureText, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  const saveSignature = () => {
    let imageData;
    if (signatureMode === 'draw') {
      if (!hasDrawn) { toast.error('Please draw your signature first'); return; }
      imageData = canvasRef.current.toDataURL('image/png');
    } else {
      imageData = generateTextSignature();
      if (!imageData) return;
    }
    onSave(imageData.split(',')[1], signatureText, selectedFont);
    toast.success('Signature saved!');
  };

  const handleNameChange = (newName) => {
    setSignatureText(newName);
    if (signatureType === 'signature' || signatureType === 'name') {
      setSignerName(newName);   
    }
  };

  const showDrawOption  = signatureType === 'signature';
  const showFontSelector = signatureType === 'signature';
  const isReadOnly      = signatureType === 'date' || signatureType === 'initials';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{getModalTitle()}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{getFieldDescription()}</p>
            </div>
            <button
              onClick={onCancel}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {showDrawOption && (
            <div className="flex gap-2 mt-3">
              {['draw', 'type'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSignatureMode(mode)}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition ${
                    signatureMode === mode
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'draw' ? '✍️ Draw' : '⌨️ Type'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">

          {/* Draw canvas */}
          {signatureMode === 'draw' && showDrawOption && (
            <div>
              <p className="text-slate-500 text-sm mb-2">Draw your signature below</p>
              <div className="border-2 border-slate-200 rounded-xl overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  className="w-full cursor-crosshair bg-white"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </div>
          )}

          {/* Type mode */}
          {signatureMode === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {signatureType === 'date'     ? 'Date'      :
                   signatureType === 'initials' ? 'Initials'  :
                   signatureType === 'name'     ? 'Full Name' : 'Text'}
                </label>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={getPlaceholder()}
                  readOnly={isReadOnly}
                  className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-base transition ${
                    isReadOnly ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''
                  }`}
                />
                {isReadOnly && signatureType === 'initials' && !signerInitials && (
                  <p className="text-amber-600 text-xs mt-1 font-medium">
                    ⚠️ Sign the main "Signature" field first — initials will auto-fill from your name.
                  </p>
                )}
                {!isReadOnly && signatureType === 'signature' && (
                  <p className="text-slate-400 text-xs mt-1">Your name will auto-fill initials and name fields</p>
                )}
              </div>
              {showFontSelector && signatureText && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Choose Font Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {fonts.map((font) => (
                      <button
                        key={font.name}
                        type="button"
                        onClick={() => setSelectedFont(font.name)}
                        className={`p-3 border-2 rounded-xl transition ${
                          selectedFont === font.name
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <p style={{ fontFamily: font.name }} className="text-xl sm:text-2xl text-center text-slate-800 truncate">
                          {signatureText || 'Your Name'}
                        </p>
                        <p className="text-xs text-slate-500 text-center mt-1 truncate">{font.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {signatureText && (
                <div className="border-2 border-slate-100 rounded-xl p-4 bg-white">
                  <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Preview</p>
                  <p
                    style={{
                      fontFamily: showFontSelector ? selectedFont : 'Arial',
                      fontSize:   signatureType === 'initials' ? '52px' : '40px',
                      fontStyle:  showFontSelector ? 'italic' : 'normal',
                    }}
                    className="text-center text-slate-900 leading-tight"
                  >
                    {signatureText}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>


        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex gap-3">
          {signatureMode === 'draw' && showDrawOption && (
            <button
              type="button"
              onClick={clearCanvas}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveSignature}
            disabled={signatureMode === 'draw' ? !hasDrawn : !signatureText.trim()}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold text-sm hover:from-emerald-700 hover:to-emerald-800 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignatureCanvas;