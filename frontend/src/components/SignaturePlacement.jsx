import { useState, useRef, useCallback, useEffect } from 'react';

const isTempId = (id) => {
  if (id === null || id === undefined) return true;
  const s = String(id);
  return s.startsWith('temp_') || s.startsWith('temp-');
};

function SignaturePlacement({
  pageNumber,
  signatures,
  onAddSignature,
  onRemoveSignature,
  onUpdatePosition,
  onUpdateSize,
  onSignClick,
  signatureType     = 'signature',
  enableDragAndDrop = false,
  isPreviewMode     = false,
  documentStatus    = 'pending',
  signerNames       = {},
  currentSignerName = null,
}) {
  const overlayRef = useRef(null);
  const liveRef    = useRef({});
  const [, setRenderTick] = useState(0);
  const forceRender = useCallback(() => setRenderTick((t) => t + 1), []);

  const draggingRef  = useRef(null);
  const resizingRef  = useRef(null);
  const dragMovedRef = useRef(false);

  const [hoveredId, setHoveredId]           = useState(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [drawing, setDrawing]               = useState(null);
  const [drawBox, setDrawBox]               = useState(null);
  const [, forceHover]                      = useState(0);

  const hideInteraction = isPreviewMode;
  const pageSignatures = signatures
    .filter((s) => s.page_number === pageNumber && s.id !== undefined && s.id !== null);

  useEffect(() => {
    const onMove = (e) => {
      const d = draggingRef.current;
      const r = resizingRef.current;
      if (!d && !r) return;
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (d) {
        const dxPx = e.clientX - d.startMouseX;
        const dyPx = e.clientY - d.startMouseY;
        if (!dragMovedRef.current && (Math.abs(dxPx) > 3 || Math.abs(dyPx) > 3)) {
          dragMovedRef.current = true;
        }
        const sig = signatures.find((s) => s.id === d.sigId);
        const w = sig?.width  || 0.25;
        const h = sig?.height || 0.08;
        liveRef.current[d.sigId] = {
          x: Math.max(0, Math.min(1 - w, d.startSigX + dxPx / rect.width)),
          y: Math.max(0, Math.min(1 - h, d.startSigY + dyPx / rect.height)),
          w, h,
        };
        forceRender();
      }

      if (r) {
        const dx = (e.clientX - r.startMouseX) / rect.width;
        const dy = (e.clientY - r.startMouseY) / rect.height;
        let { startW: newW, startH: newH, startX: newX, startY: newY } = r;
        switch (r.corner) {
          case 'se': newW = r.startW + dx; newH = r.startH + dy; break;
          case 'sw': newW = r.startW - dx; newX = r.startX + dx; newH = r.startH + dy; break;
          case 'ne': newW = r.startW + dx; newH = r.startH - dy; newY = r.startY + dy; break;
          case 'nw': newW = r.startW - dx; newX = r.startX + dx; newH = r.startH - dy; newY = r.startY + dy; break;
          default: break;
        }
        newW = Math.max(0.06, Math.min(0.98, newW));
        newH = Math.max(0.03, Math.min(0.98, newH));
        newX = Math.max(0, Math.min(0.98 - newW, newX));
        newY = Math.max(0, Math.min(0.98 - newH, newY));
        liveRef.current[r.sigId] = { x: newX, y: newY, w: newW, h: newH };
        forceRender();
      }
    };

    const onUp = () => {
      const d = draggingRef.current;
      const r = resizingRef.current;
      if (d) {
        const live = liveRef.current[d.sigId];
        if (live && dragMovedRef.current && !isTempId(d.sigId)) {
          onUpdatePosition(d.sigId, live.x, live.y);
        }
        draggingRef.current  = null;
        dragMovedRef.current = false;
        forceRender();
      }
      if (r) {
        const live = liveRef.current[r.sigId];
        if (live && onUpdateSize && !isTempId(r.sigId)) {
          onUpdateSize(r.sigId, live.w, live.h, live.x, live.y);
        }
        resizingRef.current = null;
        forceRender();
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [signatures, onUpdatePosition, onUpdateSize, forceRender]);

  useEffect(() => { liveRef.current = {}; }, [signatures]);

  const startDrag = useCallback((e, sig) => {
    if (hideInteraction) return;
    e.stopPropagation();
    e.preventDefault();
    draggingRef.current = {
      sigId: sig.id, startMouseX: e.clientX, startMouseY: e.clientY,
      startSigX: sig.x_position, startSigY: sig.y_position,
    };
    dragMovedRef.current = false;
    forceRender();
  }, [hideInteraction, forceRender]);

  const startResize = useCallback((e, sig, corner) => {
    if (hideInteraction) return;
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = {
      sigId: sig.id, corner,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startW: sig.width || 0.25, startH: sig.height || 0.08,
      startX: sig.x_position, startY: sig.y_position,
    };
    forceRender();
  }, [hideInteraction, forceRender]);

  const handleDragOver  = (e) => { if (!enableDragAndDrop || hideInteraction) return; e.preventDefault(); e.stopPropagation(); setDropZoneActive(true); };
  const handleDragLeave = () => setDropZoneActive(false);
  const handleDrop      = (e) => {
    if (!enableDragAndDrop || hideInteraction) return;
    e.preventDefault(); e.stopPropagation();
    setDropZoneActive(false);
    const fieldType = e.dataTransfer.getData('fieldType');
    if (!fieldType) return;
    const rect  = overlayRef.current.getBoundingClientRect();
    const x     = (e.clientX - rect.left) / rect.width;
    const y     = (e.clientY - rect.top)  / rect.height;
    const sizes = { signature:{width:0.25,height:0.08}, initials:{width:0.12,height:0.06}, name:{width:0.25,height:0.06}, date:{width:0.20,height:0.05}, text:{width:0.25,height:0.06} };
    const size  = sizes[fieldType] || sizes.signature;
    onAddSignature({ pageNumber, x: Math.max(0, Math.min(x - size.width/2, 0.9)), y: Math.max(0, Math.min(y - size.height/2, 0.9)), width: size.width, height: size.height, type: fieldType });
  };

  const commitDraw = (box, rect) => {
    if (box && box.w > 20 && box.h > 20) {
      onAddSignature({
        pageNumber,
        x:      box.x / rect.width,
        y:      box.y / rect.height,
        width:  box.w / rect.width,
        height: box.h / rect.height,
        type:   signatureType,
      });
    }
    setDrawing(null);
    setDrawBox(null);
  };

  const handleOverlayMouseDown = (e) => {
    if (hideInteraction || enableDragAndDrop || draggingRef.current || resizingRef.current) return;
    if (!e.target.classList.contains('pdf-overlay')) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    setDrawing({ startX: sx, startY: sy });
    setDrawBox({ x: sx, y: sy, w: 0, h: 0 });
  };
  const handleOverlayMouseMove = (e) => {
    if (!drawing) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    setDrawBox({ x: Math.min(cx, drawing.startX), y: Math.min(cy, drawing.startY), w: Math.abs(cx - drawing.startX), h: Math.abs(cy - drawing.startY) });
  };
  const handleOverlayMouseUp = (e) => {
    if (!drawing) return;
    const rect = overlayRef.current.getBoundingClientRect();
    commitDraw(drawBox, rect);
  };

  const handleOverlayTouchStart = (e) => {
    if (hideInteraction || enableDragAndDrop) return;

    const target = e.target;
    const isOnField = target.closest?.('[data-sig-field]');
    if (isOnField) return;
    e.preventDefault();
    const rect = overlayRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const sx = touch.clientX - rect.left, sy = touch.clientY - rect.top;
    setDrawing({ startX: sx, startY: sy });
    setDrawBox({ x: sx, y: sy, w: 0, h: 0 });
  };
  const handleOverlayTouchMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const rect = overlayRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const cx = touch.clientX - rect.left, cy = touch.clientY - rect.top;
    setDrawBox({ x: Math.min(cx, drawing.startX), y: Math.min(cy, drawing.startY), w: Math.abs(cx - drawing.startX), h: Math.abs(cy - drawing.startY) });
  };
  const handleOverlayTouchEnd = () => {
    if (!drawing) return;
    const rect = overlayRef.current.getBoundingClientRect();
    commitDraw(drawBox, rect);
  };

  const getIcon  = (t) => ({ signature:'✍️', initials:'🔤', name:'👤', date:'📅', text:'📝' }[t] ?? '✍️');
  const getLabel = (sig) => sig.signature_text || ({ signature:'Sign here', initials:'Add initials', name:'Full Name', date:'Date', text:'Text' }[sig.signature_type] ?? 'Sign here');
  const getImgSrc = (sig) => {
    if (!sig.signature_image_path) return null;
    const fn = sig.signature_image_path.split(/[\\\/]/).pop();
    return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/signatures/${fn}`;
  };

  const resizeHandles = [
    { corner: 'nw', style: { top: 3,    left:  3  }, cursor: 'nw-resize' },
    { corner: 'ne', style: { top: 3,    right: 3  }, cursor: 'ne-resize' },
    { corner: 'sw', style: { bottom: 3, left:  3  }, cursor: 'sw-resize' },
    { corner: 'se', style: { bottom: 3, right: 3  }, cursor: 'se-resize' },
  ];

  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 pdf-overlay ${hideInteraction ? 'pointer-events-none' : ''} ${dropZoneActive ? 'ring-2 ring-emerald-400 ring-inset bg-emerald-50/10' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleOverlayMouseDown}
      onMouseMove={handleOverlayMouseMove}
      onMouseUp={handleOverlayMouseUp}
      onTouchStart={handleOverlayTouchStart}
      onTouchMove={handleOverlayTouchMove}
      onTouchEnd={handleOverlayTouchEnd}
      style={{ zIndex: 10, touchAction: drawing ? 'none' : 'pan-y' }}
    >
      {pageSignatures.map((sig) => {
        const keyId = String(sig.id);
        const live  = liveRef.current[sig.id];
        const x = live ? live.x : sig.x_position;
        const y = live ? live.y : sig.y_position;
        const w = live ? live.w : (sig.width  || 0.25);
        const h = live ? live.h : (sig.height || 0.08);

        const isSigned       = sig.status === 'signed';
        const isHovered      = hoveredId === sig.id;
        const isDraggingThis = draggingRef.current?.sigId === sig.id;
        const isResizingThis = resizingRef.current?.sigId === sig.id;
        const isActive       = isDraggingThis || isResizingThis;
        const isTemp         = isTempId(sig.id);
        const imgSrc         = getImgSrc(sig);
        const showControls   = isHovered && !isDraggingThis && !isResizingThis && !isTemp;

        const assignedName =
          signerNames[sig.id] ||
          sig.assigned_to_name ||
          sig.signer_name ||
          sig.assigned_to_email ||
          sig.signer_email ||
          currentSignerName ||
          null;

        if (hideInteraction) {
          if (!isSigned) return null;
          return (
            <div key={keyId} className="absolute pointer-events-none"
              style={{ left:`${x*100}%`, top:`${y*100}%`, width:`${w*100}%`, height:`${h*100}%`, zIndex:20 }}>
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-1">
                {imgSrc
                  ? <img src={imgSrc} alt="sig" className="max-w-full max-h-full object-contain" onError={(e)=>(e.target.style.display='none')} />
                  : sig.signature_text
                    ? <span style={{fontFamily:sig.signature_font||'cursive',fontSize:`${Math.min(h*800,40)}px`,fontStyle:'italic'}} className="text-slate-900 truncate px-1">{sig.signature_text}</span>
                    : null}
              </div>
            </div>
          );
        }

        const wrapStyle = {
          position:'absolute', left:`${x*100}%`, top:`${y*100}%`, width:`${w*100}%`, height:`${h*100}%`,
          zIndex: isActive?50:isHovered?30:20,
          cursor: isDraggingThis?'grabbing':'grab',
          userSelect:'none', willChange:'transform',
          filter: isDraggingThis?'drop-shadow(0 4px 12px rgba(0,0,0,0.25))':'none',
          opacity: isTemp?0.6:1,
        };

        if (!isSigned) {
          return (
            <div
              key={keyId}
              style={wrapStyle}
              data-sig-field="true"
              onMouseEnter={() => { setHoveredId(sig.id); forceHover((n)=>n+1); }}
              onMouseLeave={() => { setHoveredId(null);   forceHover((n)=>n+1); }}
              onMouseDown={(e) => startDrag(e, sig)}

            >
              <div className={`absolute inset-0 rounded border-2 border-dashed transition-colors ${
                isTemp    ? 'border-slate-400 bg-slate-50/50' :
                isActive  ? 'border-emerald-600 bg-emerald-100/70' :
                isHovered ? 'border-emerald-500 bg-emerald-50/80' :
                            'border-emerald-400 bg-emerald-50/30'
              }`} />

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none gap-0.5">
                <span className="text-base sm:text-lg leading-none">{getIcon(sig.signature_type)}</span>
                <span className="text-emerald-700 text-[9px] sm:text-xs font-medium text-center px-1 leading-tight opacity-80 truncate max-w-full">
                  {isTemp ? 'Saving…' : getLabel(sig)}
                </span>
              </div>

              {assignedName && isHovered && !isDraggingThis && (
                <div className="absolute -top-7 left-0 pointer-events-none z-50 max-w-full">
                  <span className="bg-slate-700/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow whitespace-nowrap truncate block max-w-[180px]">
                    👤 {assignedName}
                  </span>
                </div>
              )}

              {showControls && (
                <>
                  <button
                    title={`Sign this ${sig.signature_type}`}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={(e) => { e.stopPropagation(); onSignClick?.(sig); }}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg z-50 transition-colors flex items-center gap-1"
                    style={{ marginTop: assignedName ? '-1.5rem' : '0' }}
                  >
                    ✍️ Sign
                  </button>

                  <button
                    title="Remove field"
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={(e) => { e.stopPropagation(); onRemoveSignature(sig.id); }}
                    className="absolute -top-3 -right-3 w-5 h-5 sm:w-6 sm:h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg z-50 transition-colors text-xs sm:text-sm"
                  >×</button>

                  {resizeHandles.map(({ corner, style, cursor }) => (
                    <div key={corner} onMouseDown={(e) => startResize(e, sig, corner)}
                      style={{ position:'absolute', width:8, height:8, background:'#10b981', border:'2px solid white', borderRadius:2, zIndex:51, cursor, ...style }} />
                  ))}
                </>
              )}

              {/* Mobile tap-to-sign (touch devices only) */}
              {!isTemp && isTouchDevice && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!dragMovedRef.current) onSignClick?.(sig);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 z-30"
                  aria-label={`Sign ${sig.signature_type}`}
                />
              )}
            </div>
          );
        }

        return (
          <div
            key={keyId}
            style={wrapStyle}
            data-sig-field="true"
            onMouseEnter={() => { setHoveredId(sig.id); forceHover((n)=>n+1); }}
            onMouseLeave={() => { setHoveredId(null);   forceHover((n)=>n+1); }}
            onMouseDown={(e) => startDrag(e, sig)}
          >
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-1 pointer-events-none">
              {imgSrc
                ? <img src={imgSrc} alt="sig" className="max-w-full max-h-full object-contain" onError={(e)=>(e.target.style.display='none')} />
                : sig.signature_text
                  ? <span style={{fontFamily:sig.signature_font||'cursive',fontSize:`${Math.min(h*800,40)}px`,fontStyle:'italic'}} className="text-slate-900 truncate px-1">{sig.signature_text}</span>
                  : null}
            </div>

            {isHovered && <div className="absolute inset-0 rounded border-2 border-dashed border-indigo-400 pointer-events-none" />}

            {/* ✅ Signer name tooltip for signed fields too */}
            {assignedName && isHovered && !isDraggingThis && (
              <div className="absolute -top-7 left-0 pointer-events-none z-50">
                <span className="bg-slate-700/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow whitespace-nowrap truncate block max-w-[180px]">
                  👤 {assignedName}
                </span>
              </div>
            )}

            {isHovered && !isDraggingThis && !assignedName && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-50 whitespace-nowrap hidden sm:block">
                <span className="bg-slate-800/85 text-white text-xs px-2.5 py-1 rounded-full shadow">drag to move</span>
              </div>
            )}

            {showControls && (
              <>
                <button
                  title="Delete signature"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this signature?')) onRemoveSignature(sig.id); }}
                  className="absolute -top-3 -right-3 w-5 h-5 sm:w-6 sm:h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg z-50 transition-colors text-xs sm:text-sm"
                >×</button>

                {resizeHandles.map(({ corner, style, cursor }) => (
                  <div key={corner} onMouseDown={(e) => startResize(e, sig, corner)}
                    style={{ position:'absolute', width:8, height:8, background:'#6366f1', border:'2px solid white', borderRadius:2, zIndex:51, cursor, ...style }} />
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* Draw ghost */}
      {drawBox && drawBox.w > 5 && (
        <div className="absolute border-2 border-dashed border-emerald-500 bg-emerald-100/20 rounded pointer-events-none"
          style={{ left:drawBox.x, top:drawBox.y, width:drawBox.w, height:drawBox.h, zIndex:40 }} />
      )}
    </div>
  );
}

export default SignaturePlacement;