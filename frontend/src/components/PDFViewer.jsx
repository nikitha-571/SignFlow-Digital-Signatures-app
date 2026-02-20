// import { useState, useEffect, useRef } from 'react';
// import { Document, Page, pdfjs } from 'react-pdf';
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// import 'react-pdf/dist/Page/TextLayer.css';

// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// function PDFViewer({ fileUrl, onClose }) {
//   const [numPages, setNumPages] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [scale, setScale] = useState(1.2);
//   const pageRefs = useRef({});
//   const containerRef = useRef(null);

//   function onDocumentLoadSuccess({ numPages }) {
//     setNumPages(numPages);
//   }

//   const scrollToPage = (pageNum) => {
//     const pageElement = pageRefs.current[pageNum];
//     if (pageElement && containerRef.current) {
//       const container = containerRef.current;
//       const pageTop = pageElement.offsetTop;
//       const containerHeight = container.clientHeight;
//       const pageHeight = pageElement.clientHeight;
      
//       const scrollPosition = pageTop - (containerHeight / 2) + (pageHeight / 2);
      
//       container.scrollTo({
//         top: scrollPosition,
//         behavior: 'smooth'
//       });
//       setCurrentPage(pageNum);
//     }
//   };

//   const previousPage = () => {
//     if (currentPage > 1) {
//       scrollToPage(currentPage - 1);
//     }
//   };

//   const nextPage = () => {
//     if (currentPage < numPages) {
//       scrollToPage(currentPage + 1);
//     }
//   };

//   const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
//   const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
//   const resetZoom = () => setScale(1.2);

//   useEffect(() => {
//     const container = containerRef.current;
//     if (!container) return;

//     const handleScroll = () => {
//       const containerTop = container.scrollTop;
//       const containerHeight = container.clientHeight;
//       const viewportCenter = containerTop + containerHeight / 2;

//       let closestPage = 1;
//       let closestDistance = Infinity;

//       Object.entries(pageRefs.current).forEach(([pageNum, element]) => {
//         if (element) {
//           const pageTop = element.offsetTop;
//           const pageHeight = element.clientHeight;
//           const pageCenter = pageTop + pageHeight / 2;
//           const distance = Math.abs(pageCenter - viewportCenter);

//           if (distance < closestDistance) {
//             closestDistance = distance;
//             closestPage = parseInt(pageNum);
//           }
//         }
//       });

//       setCurrentPage(closestPage);
//     };

//     container.addEventListener('scroll', handleScroll);
//     return () => container.removeEventListener('scroll', handleScroll);
//   }, [numPages]);

//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
//         e.preventDefault();
//         previousPage();
//       }
//       if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
//         e.preventDefault();
//         nextPage();
//       }
//       if (e.key === 'Home') {
//         e.preventDefault();
//         scrollToPage(1);
//       }
//       if (e.key === 'End') {
//         e.preventDefault();
//         scrollToPage(numPages);
//       }
//       if (e.key === 'Escape') {
//         onClose?.();
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [numPages, currentPage]);

//   return (
//     <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
//       <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
//         <div className="flex items-center gap-3">
//           <button
//             onClick={previousPage}
//             disabled={currentPage <= 1}
//             className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
//             title="Previous Page (← or ↑)"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//             </svg>
//           </button>
          
//           <div className="flex items-center gap-2">
//             <input
//               type="number"
//               min="1"
//               max={numPages || 1}
//               value={currentPage}
//               onChange={(e) => {
//                 const page = parseInt(e.target.value);
//                 if (page >= 1 && page <= numPages) {
//                   scrollToPage(page);
//                 }
//               }}
//               className="w-16 px-2 py-1 bg-slate-700 text-white text-center rounded border border-slate-600 focus:border-emerald-500 outline-none"
//             />
//             <span className="text-white font-medium">
//               / {numPages || '...'}
//             </span>
//           </div>
          
//           <button
//             onClick={nextPage}
//             disabled={currentPage >= numPages}
//             className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
//             title="Next Page (→ or ↓)"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//             </svg>
//           </button>
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             onClick={zoomOut}
//             disabled={scale <= 0.5}
//             className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold text-lg"
//             title="Zoom Out"
//           >
//             −
//           </button>
          
//           <button
//             onClick={resetZoom}
//             className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-medium min-w-[80px]"
//             title="Reset Zoom"
//           >
//             {Math.round(scale * 100)}%
//           </button>
          
//           <button
//             onClick={zoomIn}
//             disabled={scale >= 3.0}
//             className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold text-lg"
//             title="Zoom In"
//           >
//             +
//           </button>
//         </div>

//         <button
//           onClick={onClose}
//           className="p-2 bg-slate-700 text-white rounded-lg hover:bg-red-600 transition"
//           title="Close (Esc)"
//         >
//           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//           </svg>
//         </button>
//       </div>

//       <div 
//         ref={containerRef}
//         className="flex-1 overflow-auto bg-slate-900"
//       >
//         <div className="flex flex-col items-center py-8 gap-6">
//           <Document
//             file={fileUrl}
//             onLoadSuccess={onDocumentLoadSuccess}
//             loading={
//               <div className="text-center py-20">
//                 <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
//                 <p className="text-white font-medium text-lg">Loading PDF...</p>
//               </div>
//             }
//             error={
//               <div className="text-center bg-slate-800 p-8 rounded-xl mx-4">
//                 <div className="text-5xl mb-4">❌</div>
//                 <p className="text-red-400 font-semibold text-lg mb-2">Failed to load PDF</p>
//                 <p className="text-slate-400 text-sm">The file may be corrupted or inaccessible</p>
//               </div>
//             }
//           >

//             {numPages && Array.from(new Array(numPages), (el, index) => {
//               const pageNum = index + 1;
//               return (
//                 <div
//                   key={`page_${pageNum}`}
//                   ref={(el) => (pageRefs.current[pageNum] = el)}
//                   className="mb-6 shadow-2xl"
//                 >
//                   <Page
//                     pageNumber={pageNum}
//                     scale={scale}
//                     renderTextLayer={true}
//                     renderAnnotationLayer={true}
//                     className="bg-white"
//                   />
//                   <div className="text-center mt-3">
//                     <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
//                       currentPage === pageNum
//                         ? 'bg-emerald-500 text-white'
//                         : 'bg-slate-700 text-slate-300'
//                     }`}>
//                       {pageNum}
//                     </span>
//                   </div>
//                 </div>
//               );
//             })}
//           </Document>
//         </div>
//       </div>

//       <div className="bg-slate-800 border-t border-slate-700 px-4 py-2.5 text-center flex-shrink-0">
//         <p className="text-slate-400 text-sm">
//           <kbd className="px-2 py-1 bg-slate-700 rounded text-white text-xs mx-1">↑</kbd>
//           <kbd className="px-2 py-1 bg-slate-700 rounded text-white text-xs mx-1">↓</kbd>
//           <kbd className="px-2 py-1 bg-slate-700 rounded text-white text-xs mx-1">←</kbd>
//           <kbd className="px-2 py-1 bg-slate-700 rounded text-white text-xs mx-1">→</kbd>
//           <span className="mx-2">Navigate pages</span>
//           <span className="mx-2">•</span>
//           <span className="mx-2">Scroll to browse all pages</span>
//           <span className="mx-2">•</span>
//           <kbd className="px-2 py-1 bg-slate-700 rounded text-white text-xs mx-1">Esc</kbd>
//           <span className="mx-2">Close</span>
//         </p>
//       </div>
//     </div>
//   );
// }

// export default PDFViewer;