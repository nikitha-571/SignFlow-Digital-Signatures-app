from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
import os

from models import User, Document, Signature, AuditLog, DocumentSigner

from routers import auth, documents, signatures, audit_logs, oauth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SignFlow Digital Signatures API",
    description="Secure document signing platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://signflow-frontend-plum.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

try:
    os.makedirs("./uploads", exist_ok=True)
    os.makedirs("./signatures", exist_ok=True)
    print("✅ Upload directories created/verified")
except Exception as e:
    print(f"❌ Error creating directories: {e}")

app.mount("/signatures", StaticFiles(directory="signatures"), name="signatures")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(oauth_router.router)
app.include_router(documents.router)
app.include_router(signatures.router)
app.include_router(audit_logs.router)


@app.get("/")
def read_root():
    return {
        "message": "SignFlow API is running! 🚀",
        "version": "1.0.0",
        "features": [
            "User Authentication",
            "Document Upload & Management",
            "Digital Signatures",
            "Email Notifications",
            "Public Signing Links",
            "Audit Logs",
            "PDF Generation"
        ]
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "tables": ["users", "documents", "signatures", "audit_logs"]
    }

@app.get("/api/config/email-routing")
def get_email_routing_config():

    return {
        "enabled": os.getenv("ENABLE_EMAIL_ROUTING", "false").lower() == "true",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "provider": os.getenv("EMAIL_PROVIDER", "smtp")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)