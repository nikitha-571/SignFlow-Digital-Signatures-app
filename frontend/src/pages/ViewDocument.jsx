// import { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Document, Page, pdfjs } from 'react-pdf';
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// import 'react-pdf/dist/Page/TextLayer.css';
// import api from '../utils/api';
// import { getCurrentUser, logout } from '../utils/auth';

// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// function ViewDocument() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [document, setDocument] = useState(null);
//   const [pdfBlob, setPdfBlob] = useState(null);
//   const [numPages, setNumPages] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [scale, setScale] = useState(1.2);
//   const [loading, setLoading] = useState(true);
//   const containerRef = useRef(null);
//   const pageRefs = useRef({});

//   useEffect(() => {
//     const currentUser = getCurrentUser();
//     if (!currentUser) {
//       navigate('/login');
//     } else {
//       setUser(currentUser);
//     }
//     fetchDocument();

//     return () => {
//       if (pdfBlob) {
//         URL.revokeObjectURL(pdfBlob);
//       }
//     };
//   }, [id]);

//   const fetchDocument = async () => {
//     try {
//       const response = await api.get(`/api/documents/${id}`);
//       setDocument(response.data);
      
//       // Check if document is signed - if yes, show signed version
//       let fileResponse;
//       if (response.data.status === 'signed' && response.data.signed_file_path) {
//         // Fetch signed PDF
//         fileResponse = await api.get(`/api/documents/${id}/download-signed`, {
//           responseType: 'blob'
//         });
//       } else {
//         // Fetch original PDF
//         fileResponse = await api.get(`/api/documents/${id}/file`, {
//           responseType: 'blob'
//         });
//       }
      
//       const blob = new Blob([fileResponse.data], { type: 'application/pdf' });
//       const blobUrl = URL.createObjectURL(blob);
//       setPdfBlob(blobUrl);
      
//     } catch (err) {
//       console.error('Failed to load document:', err);
//       alert('Failed to load document');
//       navigate('/dashboard');
//     } finally {
//       setLoading(false);
//     }
//   };

//   function onDocumentLoadSuccess({ numPages }) {
//     setNumPages(numPages);
//     setCurrentPage(1);
//   }

//   const handlePageChange = (pageNumber) => {
//     if (pageNumber >= 1 && pageNumber <= numPages) {
//       setCurrentPage(pageNumber);
//       scrollToPage(pageNumber);
//     }
//   };

//   const scrollToPage = (pageNumber) => {
//     const pageElement = pageRefs.current[pageNumber];
//     if (pageElement) {
//       pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
//     }
//   };

//   useEffect(() => {
//     const handleScroll = () => {
//       if (!containerRef.current) return;
      
//       const container = containerRef.current;
//       const scrollTop = container.scrollTop;
//       const containerHeight = container.clientHeight;
//       const centerY = scrollTop + containerHeight / 2;

//       let closestPage = 1;
//       let minDistance = Infinity;

//       Object.keys(pageRefs.current).forEach((pageNum) => {
//         const pageElement = pageRefs.current[pageNum];
//         if (pageElement) {
//           const rect = pageElement.getBoundingClientRect();
//           const pageTop = rect.top + scrollTop - container.getBoundingClientRect().top;
//           const pageCenter = pageTop + rect.height / 2;
//           const distance = Math.abs(pageCenter - centerY);

//           if (distance < minDistance) {
//             minDistance = distance;
//             closestPage = parseInt(pageNum);
//           }
//         }
//       });

//       if (closestPage !== currentPage) {
//         setCurrentPage(closestPage);
//       }
//     };

//     const container = containerRef.current;
//     if (container) {
//       container.addEventListener('scroll', handleScroll);
//       return () => container.removeEventListener('scroll', handleScroll);
//     }
//   }, [currentPage]);

//   const handleKeyDown = (e) => {
//     switch (e.key) {
//       case 'ArrowLeft':
//       case 'ArrowUp':
//         e.preventDefault();
//         handlePageChange(currentPage - 1);
//         break;
//       case 'ArrowRight':
//       case 'ArrowDown':
//         e.preventDefault();
//         handlePageChange(currentPage + 1);
//         break;
//       case 'Home':
//         e.preventDefault();
//         handlePageChange(1);
//         break;
//       case 'End':
//         e.preventDefault();
//         handlePageChange(numPages);
//         break;
//       case 'Escape':
//         navigate('/dashboard');
//         break;
//       default:
//         break;
//     }
//   };

//   useEffect(() => {
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [currentPage, numPages]);

//   const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
//   const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
//   const resetZoom = () => setScale(1.2);

//   const handleLogout = () => {
//     logout();
//   };

//   if (loading) {
//     return (
//       <div className="h-screen bg-slate-900 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
//           <p className="text-white font-medium">Loading document...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="h-screen flex flex-col bg-slate-900">
//       {/* Top Bar */}
//       <div className="bg-slate-800 border-b border-slate-700 flex-shrink-0">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <button
//                 onClick={() => navigate('/dashboard')}
//                 className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-2"
//               >
//                 <span>←</span> Dashboard
//               </button>
//               <div className="border-l border-slate-600 h-6"></div>
//               <div>
//                 <h2 className="text-white font-bold">{document?.title}</h2>
//                 {document?.status === 'signed' && (
//                   <p className="text-emerald-400 text-xs font-medium">✓ Signed Version</p>
//                 )}
//               </div>
//             </div>

//             <div className="flex items-center gap-3">
//               {/* Navigation */}
//               <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-1.5">
//                 <button
//                   onClick={() => handlePageChange(currentPage - 1)}
//                   disabled={currentPage === 1}
//                   className="text-white disabled:opacity-30 hover:text-emerald-400"
//                 >
//                   ←
//                 </button>
//                 <input
//                   type="number"
//                   min={1}
//                   max={numPages}
//                   value={currentPage}
//                   onChange={(e) => handlePageChange(parseInt(e.target.value))}
//                   className="w-12 bg-transparent text-white text-center outline-none"
//                 />
//                 <span className="text-slate-400">/ {numPages}</span>
//                 <button
//                   onClick={() => handlePageChange(currentPage + 1)}
//                   disabled={currentPage === numPages}
//                   className="text-white disabled:opacity-30 hover:text-emerald-400"
//                 >
//                   →
//                 </button>
//               </div>

//               {/* Zoom */}
//               <div className="flex items-center gap-2">
//                 <button
//                   onClick={zoomOut}
//                   disabled={scale <= 0.5}
//                   className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-30 font-bold"
//                 >
//                   −
//                 </button>
//                 <button
//                   onClick={resetZoom}
//                   className="px-4 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-medium min-w-[60px]"
//                 >
//                   {Math.round(scale * 100)}%
//                 </button>
//                 <button
//                   onClick={zoomIn}
//                   disabled={scale >= 3.0}
//                   className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-30 font-bold"
//                 >
//                   +
//                 </button>
//               </div>

//               {user && <span className="text-white font-medium hidden md:block">{user.name}</span>}
//               <button
//                 onClick={handleLogout}
//                 className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition font-medium"
//               >
//                 Logout
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* PDF Viewer */}
//       <div ref={containerRef} className="flex-1 overflow-auto bg-slate-900">
//         <div className="flex flex-col items-center py-8 gap-6">
//           <Document
//             file={pdfBlob}
//             onLoadSuccess={onDocumentLoadSuccess}
//             loading={
//               <div className="text-center py-20">
//                 <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
//                 <p className="text-white font-medium">Loading PDF...</p>
//               </div>
//             }
//           >
//             {numPages && Array.from(new Array(numPages), (el, index) => {
//               const pageNum = index + 1;
//               return (
//                 <div
//                   key={`page_${pageNum}`}
//                   ref={(el) => (pageRefs.current[pageNum] = el)}
//                   className="mb-6"
//                 >
//                   <div className="relative inline-block shadow-2xl">
//                     <Page
//                       pageNumber={pageNum}
//                       scale={scale}
//                       renderTextLayer={true}
//                       renderAnnotationLayer={true}
//                       className="bg-white"
//                     />
//                   </div>
                  
//                   <div className="text-center mt-3">
//                     <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
//                       pageNum === currentPage
//                         ? 'bg-emerald-500 text-white'
//                         : 'bg-slate-700 text-slate-300'
//                     }`}>
//                       Page {pageNum}
//                     </span>
//                   </div>
//                 </div>
//               );
//             })}
//           </Document>
//         </div>
//       </div>

//       {/* Keyboard Hints */}
//       <div className="bg-slate-800 border-t border-slate-700 py-2 px-4 flex-shrink-0">
//         <div className="max-w-7xl mx-auto flex items-center justify-center gap-6 text-xs text-slate-400">
//           <span>← → Navigate</span>
//           <span>Home/End Jump</span>
//           <span>Esc Back</span>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default ViewDocument;