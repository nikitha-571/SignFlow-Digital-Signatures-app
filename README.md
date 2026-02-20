<div align="Flex">

# ✍️ SignFlow - Digital Signature Platform

  ### Secure, Scalable Digital Document Signing Made Simple

• [[Live Demo]](https://signflow-frontend-plum.vercel.app/)

• [[Backend API]](https://signflow-backend-70lm.onrender.com/docs)



</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [System Architecture](#️-system-architecture)
- [Application Walkthrough](#-application-walkthrough)
- [Installation & Setup](#-installation--setup)
- [Deployment](#-deployment)
- [Future Enhancements](#-future-enhancements)
- [Acknowledgments](#-acknowledgments)

---

## 🎯 Overview

**SignFlow** is a production-ready, enterprise-grade digital signature platform that enables users to upload PDFs, place customizable signature fields, share secure signing links, and generate legally-binding signed documents with complete audit trails.

Built with modern Python (FastAPI) and React, SignFlow mirrors real-world SaaS products like DocuSign while remaining accessible for developers to understand, extend, and deploy.

### 🎭 Real-World Use Cases

- **HR & Recruitment**: Offer letters, NDAs, policy acknowledgements
- **Legal & Compliance**: Contract signing, consent documents, regulatory approvals
- **Freelancers & Agencies**: Client agreements, proposal approvals, invoice authorizations
- **Education**: Admission forms, certificates, consent forms
- **Healthcare & Finance**: Authorization forms, secure document approvals, compliance workflows

---

## 🔴 Problem Statement

Traditional document signing workflows suffer from:

1. **Manual Delays**: Paper-based processes slow down business operations
2. **Lack of Traceability**: No audit logs for compliance verification
3. **Security Risks**: High risk of document tampering and unauthorized access
4. **Poor Visibility**: No real-time status tracking for document workflows
5. **Remote Work Challenges**: Physical signatures incompatible with distributed teams

**SignFlow solves these problems** by offering:
- ✅ Secure digital signatures with JWT authentication
- ✅ Real-time document status tracking
- ✅ Complete audit trails for compliance
- ✅ Tamper-proof signed PDFs with immutability
- ✅ Multi-signer workflows with signing order support

---

## ✨ Features

### 🔐 Core Features

| Feature | Description |
|---------|-------------|
| **🔑 Secure Authentication** | JWT-based auth with OAuth 2.0 (Google) support |
| **📤 Document Upload** | Upload PDFs up to 10MB with validation |
| **✍️ Signature Placement** | Drag-and-drop signature fields with 5 field types |
| **📧 Email Invitations** | Send secure, tokenized signing links via email |
| **🔄 Multi-Signer Workflows** | Sequential signing with signing order enforcement |
| **📄 PDF Generation** | Generate signed PDFs with embedded signatures |
| **🔍 Audit Logging** | Complete activity history with IP tracking |
| **✅ Document Status** | Track pending, signed, and rejected documents |
| **🔒 Password Reset** | Secure password recovery via email tokens |
| **🎨 Field Customization** | 5 field types: Signature, Initials, Name, Date, Text |
| **📊 Dashboard Analytics** | Track document statistics and signing progress |
| **🌐 Public Signing** | Token-based public signing (no account required) |

### 🎨 Signature Field Types

1. **✍️ Signature** - Main signature field (required)
2. **🔤 Initials** - Auto-generated from signer name
3. **👤 Full Name** - Text representation of name
4. **📅 Date** - Auto-filled current date
5. **📝 Text** - Custom text field
---

## 🛠️ Tech Stack

### **Backend** (Python FastAPI)

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.128.0 | High-performance async API framework |
| **Python** | 3.10+ | Core programming language |
| **SQLAlchemy** | 2.0.46 | ORM for database operations |
| **PostgreSQL** | 16+ | Primary relational database |
| **Pydantic** | 2.12.5 | Data validation and serialization |
| **Python-Jose** | 3.5.0 | JWT token generation/validation |
| **Passlib** | 1.7.4 | Password hashing (bcrypt) |
| **PyMuPDF (fitz)** | 1.26.7 | PDF manipulation and signature embedding |
| **Pillow** | 12.1.0 | Image processing for signatures |
| **Uvicorn** | 0.40.0 | ASGI server for production |
| **SendGrid** | 6.12.5 | Email delivery service |

### **Frontend** (React + Vite)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.4 | UI library |
| **Vite** | 7.2.5 | Fast build tool and dev server |
| **React Router-dom** | 7.13.0 | Client-side routing and navigation management |
| **Tailwind CSS** | 3.4.17 | Utility-first CSS framework |
| **Axios** | 1.13.4 | HTTP client for API calls |
| **react-pdf** | 10.3.0 | PDF rendering in browser |
| **pdfjs-dist** | 5.4.624 | PDF.js library for rendering |

### **DevOps & Deployment**

- **Backend**: Render 
- **Frontend**: Vercel 
- **Database**: Neon 
- **File Storage**: Local filesystem 
- **Email**: SendGrid / SMTP (Gmail)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   React Frontend (Vite + Tailwind CSS)               │   │
│  │   - Authentication UI                                │   │
│  │   - PDF Viewer (react-pdf)                           │   │
│  │   - Drag-and-Drop Signature Placement                │   │
│  │   - Document Dashboard                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   FastAPI Application                                │   │
│  │   - JWT Authentication Middleware                    │   │
│  │   - CORS Configuration                               │   │
│  │   - Request Validation (Pydantic)                    │   │
│  │   - Error Handling                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │   Auth       │  Documents   │  Signatures  │  Email   │  │
│  │   Service    │  Service     │  Service     │  Service │  │
│  │              │              │              │          │  │
│  │ • Register   │ • Upload     │ • Placement  │ • SMTP   │  │
│  │ • Login      │ • Finalize   │ • Drawing    │ • Send   │  │
│  │ • OAuth      │ • Download   │ • Signing    │ • Token  │  │
│  │ • Reset      │ • Delete     │ • Embed PDF  │ • Invite │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   SQLAlchemy ORM                                     │   │
│  │   - User Repository                                  │   │
│  │   - Document Repository                              │   │
│  │   - Signature Repository                             │   │
│  │   - AuditLog Repository                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER                         │
│  ┌────────────────────┬─────────────────────────────────┐   │
│  │   PostgreSQL DB    │   File System                   │   │
│  │   - users          │   - /uploads (PDFs)             │   │
│  │   - documents      │   - /signatures (images)        │   │
│  │   - signatures     │                                 │   │
│  │   - audit_logs     │                                 │   │
│  │   - doc_signers    │                                 │   │
│  └────────────────────┴─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Database Tables

```
- Users                                  
- Documents 
- Document_Signers                              
- Signatures                              
- AuditLogs

```

---

## 📱 Application Walkthrough

### 1️⃣ **Authentication & Account Management**

#### User Registration

New users create accounts by providing their full name, email, and password. The system validates password strength (minimum 6 characters), securely hashes credentials using bcrypt, and automatically generates a JWT token upon successful registration. Users are immediately logged in and redirected to the dashboard with session persistence.

<!-- Screenshot Placeholder -->
![User Registration](./images/registration.png)

**Features:**
- Full name, email, and password input
- Password strength validation (minimum 6 characters)
- Password visibility toggle
- Real-time validation feedback
- Secure bcrypt password hashing
- Automatic JWT token generation on successful registration

**API Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "User",
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "User",
  "email": "user@example.com",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "created_at": "2026-02-19T10:30:00Z"
}
```

---

#### User Login

Users authenticate via email/password or Google OAuth 2.0. The system validates credentials, generates JWT tokens for session management, and includes a password visibility toggle for better UX. A "Forgot Password" link enables self-service password recovery with secure email-based token verification.

<!-- Screenshot Placeholder -->
![User Login](./images/login.png)

**Features:**
- Email and password authentication
- Google OAuth 2.0 sign-in
- Password visibility toggle
- "Forgot Password" link
- Session persistence with JWT tokens
- Automatic redirect to dashboard on success

**API Endpoints:**
- Standard Login: `POST /api/auth/login`
- Google OAuth: `GET /api/auth/google/login`
- OAuth Callback: `POST /api/auth/google/callback`

---

#### Password Reset Flow

Users request password resets by entering their email address. The system generates a secure, time-limited token (1-hour expiration), sends a reset link via email, and allows users to set a new password. Tokens are automatically invalidated after use, and the system never reveals whether an email exists in the database for security.

<!-- Screenshot Placeholder -->
![Forgot Password](./images/forgot_password.png)

<!-- Screenshot Placeholder -->
![Reset Password](./images/reset_password.png)

**Features:**
- Secure token generation (expires in 1 hour)
- Email delivery with reset link
- Token validation
- New password confirmation
- Automatic token invalidation after use

**API Endpoints:**
- Request Reset: `POST /api/auth/forgot-password`
- Reset Password: `POST /api/auth/reset-password`

---

### 2️⃣ **Dashboard & Document Management**

#### Main Dashboard

The central hub displays real-time statistics across 6 cards (total, my documents, to sign, pending, signed, rejected documents). Users can filter by view mode, status, search terms, and sort order with active filter chips. Each document card shows status badges, creation date, and contextual actions (sign, send request, download, delete) with special handling for rejected documents including visible rejection reasons.

<!-- Screenshot Placeholder -->
![Dashboard Overview](./images/dashboard.png)

**Features:**
- **Statistics Cards:**
  - Total documents count
  - Documents created by user ("My Documents")
  - Documents sent to user for signing ("To Sign")
  - Pending documents count
  - Signed documents count
  - Rejected documents count
  
- **Advanced Filtering:**
  - View mode: All / My Documents / To Sign
  - Status filter: All / Pending / Signed / Rejected
  - Search by title or filename
  - Sort by: Newest / Oldest / Name (A-Z)
  - Active filters display with removable chips

- **Document Actions:**
  - Sign document
  - Send signing request
  - Download signed PDF
  - Delete document
  - View rejection reason (if rejected)

**API Endpoints:**
- Get User Documents: `GET /api/documents/`
- Get Received Documents: `GET /api/documents/received`

---

### 3️⃣ **Document Upload**

Users upload PDF documents via drag-and-drop or file browser with automatic validation for file type (PDF only) and size (10MB limit). The interface auto-fills document titles from filenames. Files are securely stored with unique timestamps, and metadata is saved to the database with "pending" status for subsequent signature placement.

<!-- Screenshot Placeholder -->
![Document Upload](./images/upload_document.png)

**Features:**
- Drag-and-drop file upload
- Click to browse file selector
- PDF-only validation
- 10MB file size limit
- Auto-fill document title from filename
- File preview with size display

**API Endpoint:** `POST /api/documents/`

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `file`: PDF file (binary)
  - `title`: Document title (string)

**Response:**
```json
{
  "id": 5,
  "title": "Sample",
  "original_filename": "Sample.pdf",
  "file_path": "./uploads/20260219_103045_sample.pdf",
  "status": "pending",
  "owner_id": 1,
  "created_at": "2026-02-19T10:30:45Z"
}
```

---

### 4️⃣ **Signature Field Placement**

The Field Library sidebar offers 5 color-coded field types (Signature, Initials, Name, Date, Text) with drag-and-drop placement onto PDF pages. Users can position fields precisely with real-time coordinate tracking, resize using corner handles, and see signer name tooltips on hover. 

<!-- Screenshot Placeholder -->
![Field Library](./images/field_library.png)

<!-- Screenshot Placeholder -->
![Signature Placement](./images/signature_placement.png)

**Features:**
- **Field Library Sidebar** (Desktop):
  - 5 field types with icons
  - Color-coded field types
  - Required field indicator
  - Drag-and-drop to PDF
  
- **Field Types:**
  1. **✍️ Signature** (Required) - Emerald green
  2. **🔤 Initials** - Blue
  3. **👤 Full Name** - Purple
  4. **📅 Date** - Amber
  5. **📝 Text** - Slate

- **Placement Features:**
  - Drag fields from library to PDF pages
  - Real-time position and size adjustment
  - Resize handles on corners
  - Hover tooltips showing signer name
  - Delete field button on hover

**API Endpoint:** `POST /api/signatures/`

---

### 5️⃣ **Signature Canvas**

Users sign fields via two modes: freehand drawing with smooth line rendering and high-resolution export, or typing with 7 cursive font options and live preview. The system intelligently auto-fills field types—Signature and Name use the signer's full name, Initials auto-generate from name initials, Date shows current date, and Text allows custom input. Signatures are stored as base64 images or text with font metadata for PDF embedding.

<!-- Screenshot Placeholder -->
![Draw Signature](./images/draw_signature.png)

<!-- Screenshot Placeholder -->
![Type Signature](./images/type_signature.png)

**Features:**
- **Two Signature Modes:**
  - **✍️ Draw Mode:**
    - Freehand drawing with mouse or touch
    - Smooth line rendering
    - Clear canvas button
    - High-resolution export
  
  - **⌨️ Type Mode:**
    - 7 cursive font options
    - Live preview
    - Auto-fill from previous signatures
    - Custom text for each field type

- **Auto-Fill Intelligence:**
  - **Signature**: Uses signer's full name
  - **Initials**: Auto-generated from first letters of name
  - **Name**: Full name from profile
  - **Date**: Current date (auto-filled)
  - **Text**: Custom user input

**API Endpoint:** `POST /api/signatures/{signature_id}/sign`

---

### 6️⃣ **Multi-Signer Workflow**

Document owners can send signing requests to up to 10 signers with customizable workflow options. Sequential signing can be enabled with reorder controls, ensuring each signer completes before the next receives their invitation. The system validates all email addresses, prevents duplicates, and allows personalized messages. Emails include secure tokenized links with 72-hour expiration.

<!-- Screenshot Placeholder -->
![Send Signing Request](./images/send_signing_request.png)

**Features:**
- **Add Multiple Signers:**
  - Name and email for each signer
  - Add up to 10 signers
  - Remove signers individually
  - Validation for duplicate emails

- **Signing Order (Optional):**
  - Sequential signing enforcement
  - Up/down arrows to adjust order
  - First signer notified immediately
  - Subsequent signers notified after previous completion

- **Custom Message:**
  - Optional personalized message
  - Included in all invitation emails
  - Rich text formatting support

- **Email Routing (Development):**
  - Route all emails to backend email for testing
  - Toggle in environment configuration

**API Endpoint:** `POST /api/documents/{id}/send-multiple-signing-requests`


---

### 7️⃣ **Public Signing Interface**

External signers access documents via secure tokenized URLs without requiring accounts. The interface displays the PDF with a right sidebar showing required/optional signatures, progress tracking, and finalize/reject buttons. Preview mode allows signers to view the final signed document before submission. All interactions are validated against the 72-hour token expiration.

<!-- Screenshot Placeholder -->
![Public Signing Link](./images/public_signing_link.png)

**Features:**
- **Secure Token-Based Access:**
  - Unique tokenized URLs
  - 72-hour token expiration
  - No account required to sign
  - Email verification from token

- **Signing Panel (Right Sidebar):**
  - Required signatures list
  - Optional fields list
  - Completed signatures
  - Progress bar
  - Reject document button
  - Finalize document button

- **Preview Mode:**
  - View-only mode to preview signed document
  - Toggle between edit and preview
  - Shows final appearance before finalization

**API Endpoints:**
- Get Document: `GET /api/documents/public/{token}`
- Get PDF: `GET /api/documents/public/{token}/file`
- Get Signatures: `GET /api/signatures/public/{token}`
- Add Signature: `POST /api/signatures/public/{token}`
- Sign Field: `POST /api/signatures/public/{token}/{signature_id}/sign`
- Finalize: `POST /api/documents/public/{token}/finalize`
- Reject: `POST /api/documents/public/{token}/reject`

---

### 8️⃣ **Document Rejection**

Signers can reject documents through a two-step modal: selecting from six predefined reasons or entering custom text (minimum 6 characters), followed by confirmation with a summary of consequences. The system immediately updates document status to "rejected", stores the reason and timestamp in the database, deactivates the signing link, and sends an email notification to the document owner with the full rejection details for follow-up action.

<!-- Screenshot Placeholder -->
![Rejection Modal](./images/rejection_modal.png)

<!-- Screenshot Placeholder -->
![Rejection Confirmation](./images/rejection_confirmation.png)

**Features:**
- **Two-Step Rejection Process:**
  - **Step 1**: Select reason from predefined list or enter custom reason
  - **Step 2**: Confirm rejection with summary

- **Predefined Rejection Reasons:**
  - "I did not authorize this document"
  - "The document contains errors"
  - "I need more time to review"
  - "I disagree with the terms"
  - "Wrong person - not intended for me"
  - "Other (specify below)"

- **Custom Reason:**
  - Minimum 6 characters required
  - Character counter (max 200)
  - Required for "Other" option

- **Notifications:**
  - Document owner notified via email
  - Document status changes to "rejected"
  - Rejection reason stored in database
  - Timestamp recorded

**API Endpoint:** `POST /api/documents/public/{token}/reject`

**Request Body:**
```json
{
  "reason": "The Reason."
}
```

---

### 9️⃣ **PDF Generation & Download**

After all required signatures are completed, users click "Finalize Document" to trigger PyMuPDF-based PDF generation. The backend embeds high-resolution signature images or renders text-based signatures with custom fonts at precise coordinates, maintaining original PDF quality across all pages. The signed PDF is saved with a timestamped filename, document status changes to "signed", and download links become available in the dashboard .

<!-- Screenshot Placeholder -->
![Signed PDF](./images/signed_pdf.png)

**Features:**
- **Signature Embedding:**
  - High-resolution signature images embedded
  - Text-based signatures with custom fonts
  - Precise positioning based on coordinates
  - Multi-page signature support
  - Maintains original PDF quality

- **PDF Generation Process:**
  1. User completes all required signatures
  2. Click "Finalize Document" button
  3. Backend generates signed PDF using PyMuPDF
  4. Original PDF + signatures → Signed PDF
  5. Signed PDF saved to filesystem
  6. Document status changes to "signed"
  7. Download link becomes available

- **Download Options:**
  - Download from dashboard
  - Filename: `signed_{original_filename}`

**API Endpoints:**
- Finalize Document: `POST /api/documents/{id}/finalize`
- Download Signed PDF: `GET /api/documents/{id}/download-signed`
- Public Download: `GET /api/documents/public/{token}/download-signed`

---

### 🔟 **Audit Logs**

Comprehensive activity tracking captures all user actions including authentication events, document operations, signature activities, and email notifications. Each log entry records the action type, description, IP address, user agent, and timestamp with relative time display ("2 hours ago"). Users can filter by time period (24 hours to 90 days), action type, or specific document, with summary statistics showing total activities and action breakdowns for compliance and security auditing purposes.

<!-- Screenshot Placeholder -->
![Audit Logs](./images/audit_logs.png)

**Features:**
- **Complete Activity History:**
  - User registration and login events
  - Document uploads, views, and downloads
  - Signature creation and signing events
  - Document finalization and rejection
  - Email sending events
  - Public document access

- **Filtering Options:**
  - Time period: 24 hours / 7 days / 30 days / 90 days
  - Action type filter
  - Document-specific logs
  - Reset filters button

- **Log Details:**
  - Action name with icon
  - Description
  - IP address
  - User agent (browser/device)
  - Timestamp (relative and absolute)

- **Summary Statistics:**
  - Total activities in period
  - Action breakdown chart
  - Most recent activity timestamp

**API Endpoints:**
- Get Logs: `GET /api/audit-logs/`
- Get by Document: `GET /api/audit-logs/document/{document_id}`
- Get Summary: `GET /api/audit-logs/summary`

---

### 1️⃣1️⃣ **Document Status Tracking**

**Status Flow:**

```
[UPLOADED] 
    │
    ├──> [PENDING] ──────> [SIGNED] ──────> [FINALIZED]
    │                          │
    └──────────────────────────┼──> [REJECTED]
                               │
                               └──> [DELETED]
```

**Status Indicators:**

| Status | Badge Color | Icon | Description |
|--------|-------------|------|-------------|
| **Pending** | Amber | ⏳ | Awaiting signatures |
| **Signed** | Emerald | ✅ | All signers completed |
| **Rejected** | Rose | ❌ | Rejected by signer |

---

## 🚀 Installation & Setup

### Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 16.x or higher
- **PostgreSQL**: 16 or higher (or use Neon/Supabase)
- **Git**: For cloning the repository

---

### Backend Setup

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/signflow.git
cd signflow/backend
```

#### 2. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/signflow

# JWT Security
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Upload
UPLOAD_FOLDER=./uploads
MAX_FILE_SIZE=10485760

# Email Configuration
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=SignFlow

# Optional: SendGrid (Production)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Email Routing (Development)
BACKEND_NOTIFICATION_EMAIL=backend@example.com
ENABLE_EMAIL_ROUTING=true

# App URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000

# Signing Token
SIGNING_TOKEN_EXPIRE_HOURS=72

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

#### 5. Create Database

```bash
# Using psql
createdb signflow

# Or use your PostgreSQL GUI tool
```

#### 6. Start Backend Server

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

---

### Frontend Setup

#### 1. Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8000
```

#### 4. Start Development Server

```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

#### 5. Build for Production

```bash
npm run build
```
---

## 🌐 Deployment

### Backend Deployment (Render)

- **Push your backend/ folder to GitHub**
- **Create a new Web Service on Render**
- **Set Root Directory to backend**
- **Set Build Command: pip install -r requirements.txt**
- **Set Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT**
- **Add all environment variables from backend/.env in the Environment tabr**
- **For the database, create a free PostgreSQL instance on Supabase or Neon and paste the connection URL as DATABASE_URL**


Your backend will be live at: `https://your-app.render.app`

---

### Frontend Deployment (Vercel)

- **Push your frontend/ folder to GitHub**
- **Create a new project on Vercel and import from GitHub**
- **Set Root Directory to frontend**
- **Add environment variable: VITE_API_URL = https://yourbackend-api.onrender.com**
- **Deploy**

Your frontend will be live at: `https://your-app.vercel.app`

---

### Alternative Deployment Options

#### Backend:
- **Railway**: Similar to Render, automatic deploys from Git
- **Fly.io**: Global edge deployment
- **Heroku**: Classic PaaS platform
- **AWS EC2**: Full control VPS
- **DigitalOcean App Platform**: Managed hosting

#### Frontend:
- **Netlify**: Alternative to Vercel
- **Cloudflare Pages**: Fast edge deployment
- **AWS Amplify**: AWS-integrated hosting
- **GitHub Pages**: Free static hosting (build required)

#### Database:
- **Neon**: Serverless PostgreSQL
- **Supabase**: PostgreSQL with built-in auth
- **Railway PostgreSQL**: Integrated with Railway
- **AWS RDS**: Managed PostgreSQL on AWS

---


## 🚀 Future Enhancements

### Planned Features

1. **Advanced Analytics Dashboard**
   - Document signing velocity tracking
   - Signer completion rates
   - Average time-to-sign metrics
   - Monthly/yearly trends

2. **Template Management**
   - Save documents as reusable templates
   - Pre-placed signature fields
   - Template library
   - Clone and customize templates

3. **Bulk Operations**
   - Send same document to 100+ signers
   - Bulk status updates
   - Batch download signed documents
   - CSV import for signer lists

---

---

## 👥 Authors

- **Nikitha Devaraj** 

---

## 🙏 Acknowledgments

- **FastAPI** - For the amazing async framework
- **React** - For the powerful UI library
- **PyMuPDF** - For PDF manipulation capabilities
- **Tailwind CSS** - For rapid UI development
- **react-pdf** - For PDF rendering in browser

## 🔗 Links

- **Live Demo**: [https://signflow-frontend-plum.vercel.app/](#)
- **API Documentation**: [https://signflow-backend-70lm.onrender.com/docs](#)
---

<div align="center">


</div>