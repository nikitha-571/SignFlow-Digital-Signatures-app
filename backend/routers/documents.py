from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header, Request
from models.document_signer import DocumentSigner
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
import shutil
from models.document import Document, DocumentStatus
from schemas.document import DocumentResponse, DocumentListResponse
from services.pdf_service import generate_signed_pdf
from models.signature import Signature
from middleware.auth_middleware import get_current_user
from fastapi.responses import FileResponse
import os
import uuid
from typing import List, Optional
from services.email_service import (
    send_signing_request_email,
    send_document_signed_email,
    verify_signing_token, generate_signing_token, SIGNING_TOKEN_EXPIRE_HOURS, send_document_rejected_email,send_signer_download_email
)
from services.audit_service import create_audit_log, AuditActions
from schemas.signer import SignerCreate, SignerResponse
from models.document_signer import DocumentSigner
from pydantic import BaseModel,EmailStr
from services.email_service import BACKEND_URL

router = APIRouter(prefix="/api/documents", tags=["Documents"])

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 10485760))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_root(
        title: str = Form(...),
        file: UploadFile = File(...),
        request: Request = None,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 10MB"
        )

    uploads_dir = "./uploads"
    os.makedirs(uploads_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_filename = file.filename
    safe_filename = f"{timestamp}_{original_filename}"
    file_path = os.path.join(uploads_dir, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    new_document = Document(
        title=title,
        original_filename=original_filename,
        file_path=file_path,
        owner_id=current_user.id,
        status=DocumentStatus.PENDING
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    create_audit_log(
        db=db,
        action=AuditActions.DOCUMENT_UPLOADED,
        description=f"Document uploaded: {title}",
        user_id=current_user.id,
        document_id=new_document.id,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None
    )

    return new_document


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
        title: str = Form(...),
        file: UploadFile = File(...),
        request: Request = None,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 10MB"
        )
    uploads_dir = "./uploads"
    os.makedirs(uploads_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    new_document = Document(
        title=title,
        original_filename = file.filename,
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename),
        owner_id=current_user.id,
        status=DocumentStatus.PENDING
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    create_audit_log(
        db=db,
        action=AuditActions.DOCUMENT_UPLOADED,
        description=f"Document uploaded: {title}",
        user_id=current_user.id,
        document_id=new_document.id,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None
    )

    return new_document


@router.get("/", response_model=DocumentListResponse)
def get_documents(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    documents = db.query(Document).filter(Document.owner_id == current_user.id).order_by(
        Document.created_at.desc()).all()

    return {
        "documents": documents,
        "total": len(documents)
    }

@router.get("/received")
def get_received_documents(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    try:
        print(f"🔍 Looking for documents sent to: {current_user.email}")

        document_signers = db.query(DocumentSigner).filter(
            DocumentSigner.signer_email == current_user.email
        ).all()

        document_ids = list(set([ds.document_id for ds in document_signers]))

        if not document_ids:
            return []

        documents = db.query(Document).filter(
            Document.id.in_(document_ids)
        ).order_by(Document.created_at.desc()).all()

        result = []
        for doc in documents:
            result.append({
                "id": doc.id,
                "title": doc.title,
                "original_filename": doc.original_filename,
                "file_path": doc.file_path,
                "status": doc.status,
                "owner_id": doc.owner_id,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "updated_at": doc.updated_at.isoformat() if doc.updated_at else None
            })

        return result

    except Exception as e:
        print(f"❌ Error: {e}")
        return []

@router.get("/debug/{document_id}")
def debug_document(
        document_id: int,
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        return {
            "error": "Document not found in database",
            "document_id": document_id
        }

    file_exists = os.path.exists(document.file_path)

    file_size = 0
    if file_exists:
        try:
            file_size = os.path.getsize(document.file_path)
        except:
            file_size = -1

    return {
        "document_id": document.id,
        "title": document.title,
        "original_filename": document.original_filename,
        "file_path": document.file_path,
        "file_exists": file_exists,
        "file_size_bytes": file_size,
        "absolute_path": os.path.abspath(document.file_path),
        "current_working_directory": os.getcwd(),
        "status": document.status
    }

@router.get("/{document_id}/signers")
def get_document_signers(
        document_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    if not document:

        signer_check = db.query(DocumentSigner).filter(
            DocumentSigner.document_id == document_id,
            DocumentSigner.signer_email == current_user.email
        ).first()
        if not signer_check:
            raise HTTPException(status_code=404, detail="Document not found")

    signers = db.query(DocumentSigner).filter(
        DocumentSigner.document_id == document_id
    ).order_by(DocumentSigner.signing_order).all()

    result = []
    for signer in signers:
        result.append({
            "id": signer.id,
            "signer_email": signer.signer_email,
            "signer_name": signer.signer_name,
            "signing_token": signer.signing_token,
            "signing_order": signer.signing_order,
            "status": signer.status,
            "signed_at": signer.signed_at,
            "rejection_reason": getattr(signer, 'rejection_reason', None),
            "rejected_at": getattr(signer, 'rejected_at', None),
        })

    return result


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
        document_id: int,
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    create_audit_log(
        db=db,
        action=AuditActions.DOCUMENT_VIEWED,
        description=f"Document viewed: {document.title}",
        user_id=current_user.id,
        document_id=document_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )

    return document


@router.get("/{document_id}/file")
async def get_document_file(
        document_id: int,
        authorization: Optional[str] = Header(None),
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )

    return FileResponse(
        path=document.file_path,
        media_type="application/pdf",
        filename=document.original_filename,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.post("/{document_id}/finalize")
def finalize_document(
        document_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    signatures = db.query(Signature).filter(
        Signature.document_id == document_id,
        Signature.status == "signed"
    ).all()


    signed_signatures = [sig for sig in signatures if sig.status == "signed"]
    if not signed_signatures:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No signatures have been signed yet"
        )

    try:

        signed_pdf_path = generate_signed_pdf(
            original_pdf_path=document.file_path,
            signatures=signatures
        )


        document.signed_file_path = signed_pdf_path
        document.status = DocumentStatus.SIGNED

        db.commit()
        create_audit_log(
            db=db,
            action=AuditActions.DOCUMENT_FINALIZED,
            description=f"Document finalized: {document.title}",
            user_id=current_user.id,
            document_id=document.id
        )
        db.refresh(document)

        return {
            "message": "Document finalized successfully",
            "signed_pdf_path": signed_pdf_path,
            "document": document
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to finalize document: {str(e)}"
        )


@router.get("/{document_id}/download-signed")
def download_signed_document(
        document_id: int,
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if not document.signed_file_path or not os.path.exists(document.signed_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signed document not found. Please finalize the document first."
        )

    create_audit_log(
        db=db,
        action=AuditActions.DOCUMENT_DOWNLOADED,
        description=f"Signed document downloaded: {document.title}",
        user_id=current_user.id,
        document_id=document_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )

    return FileResponse(
        path=document.signed_file_path,
        media_type="application/pdf",
        filename=f"signed_{document.original_filename}",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.get("/public/{token}/download-signed")
def download_signed_public(token: str, db: Session = Depends(get_db)):

    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired signing link")

    document_id = payload.get("document_id")
    signer_email = payload.get("signer_email")

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status != DocumentStatus.SIGNED:
        raise HTTPException(status_code=400, detail="Document has not been fully signed yet")

    if not document.signed_file_path or not os.path.exists(document.signed_file_path):
        raise HTTPException(status_code=404, detail="Signed file not found on server")

    return FileResponse(
        path=document.signed_file_path,
        media_type="application/pdf",
        filename=f"signed_{document.original_filename}",
        headers={"Access-Control-Allow-Origin": "*"}
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
        document_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )


    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    if document.signed_file_path and os.path.exists(document.signed_file_path):
        os.remove(document.signed_file_path)


    signatures = db.query(Signature).filter(Signature.document_id == document_id).all()
    for sig in signatures:
        if sig.signature_image_path and os.path.exists(sig.signature_image_path):
            os.remove(sig.signature_image_path)


    db.delete(document)
    db.commit()

    return None


@router.post("/{document_id}/send-signing-request")
async def send_signing_request(
        document_id: int,
        signer_email: str,
        signer_name: str,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )


    success = await send_signing_request_email(
        signer_email=signer_email,
        signer_name=signer_name,
        document_title=document.title,
        document_id=document.id,
        sender_name=current_user.name
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )

    return {
        "message": "Signing request sent successfully",
        "signer_email": signer_email
    }



@router.get("/public/{token}")
def get_document_by_token(
        token: str,
        db: Session = Depends(get_db)
):
    payload = verify_signing_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired signing link"
        )

    document_id = payload.get("document_id")
    signer_email = payload.get("signer_email")

    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return {
        "document": document,
        "signer_email": signer_email,
        "token": token
    }


@router.get("/public/{token}/file")
async def get_public_document_file(
        token: str,
        db: Session = Depends(get_db)
):
    from services.email_service import verify_signing_token

    payload = verify_signing_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired signing link"
        )

    document_id = payload.get("document_id")
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )

    return FileResponse(
        path=document.file_path,
        media_type="application/pdf",
        filename=document.original_filename,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.get("/public/{token}/signers")
def get_public_document_signers(token: str, db: Session = Depends(get_db)):
    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired signing link")

    document_id = payload.get("document_id")

    signers = db.query(DocumentSigner).filter(
        DocumentSigner.document_id == document_id
    ).all()

    return [
        {
            "id": s.id,
            "signer_email": s.signer_email,
            "signer_name": s.signer_name,
            "status": s.status,
            "signing_order": s.signing_order,
            "signed_at": s.signed_at.isoformat() if s.signed_at else None,
            "rejection_reason": getattr(s, 'rejection_reason', None),
            "rejected_at": getattr(s, 'rejected_at', None).isoformat() if getattr(s, 'rejected_at', None) else None,
        }
        for s in signers
    ]

@router.put("/public/{token}/{signature_id}/size")
async def update_signature_size_public(
    token: str,
    signature_id: int,
    width: float,
    height: float,
    x_position: float,
    y_position: float,
    db: Session = Depends(get_db)
):
    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired signing link")

    sig = db.query(Signature).filter(Signature.id == signature_id).first()
    if not sig:
        raise HTTPException(status_code=404, detail="Signature not found")


    sig.width = max(0.05, min(0.95, width))
    sig.height = max(0.03, min(0.95, height))
    sig.x_position = max(0, min(0.95, x_position))
    sig.y_position = max(0, min(0.95, y_position))
    db.commit()

    return {"message": "Size updated", "width": sig.width, "height": sig.height}

@router.post("/public/{token}/finalize")
async def finalize_public_document(
        token: str,
        request: Request,
        db: Session = Depends(get_db)
):
    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired signing link"
        )

    document_id = payload.get("document_id")
    signer_email = payload.get("signer_email")

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    signer = db.query(DocumentSigner).filter(
        DocumentSigner.document_id == document_id,
        DocumentSigner.signer_email == signer_email
    ).first()

    if signer:
        signer.status = "signed"
        signer.signed_at = datetime.utcnow()
        db.commit()

        if signer.signing_order > 0:
            await notify_next_signer(document_id, db)

    all_signers = db.query(DocumentSigner).filter(
        DocumentSigner.document_id == document_id
    ).all()

    all_signed = all(s.status == "signed" for s in all_signers)

    if all_signed:
        signatures = db.query(Signature).filter(
            Signature.document_id == document_id,
            Signature.status == "signed"
        ).all()

        signed_signatures = [sig for sig in signatures if sig.status == "signed"]
        if not signed_signatures:
            raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No signatures have been signed yet"
        )

        try:
            from services.pdf_service import generate_signed_pdf
            signed_pdf_path = generate_signed_pdf(
            original_pdf_path=document.file_path,
            signatures=signatures
            )

            document.signed_file_path = signed_pdf_path
            document.status = DocumentStatus.SIGNED

            db.commit()

            create_audit_log(
                db=db,
                action=AuditActions.DOCUMENT_FINALIZED,
                description=f"Document finalized by {signer_email} via public link",
                document_id=document.id,
                user_id=document.owner_id,
                ip_address=request.client.host,
                user_agent=request.headers.get("user-agent")
            )

            owner = db.query(User).filter(User.id == document.owner_id).first()
            if owner:
                await send_document_signed_email(
                    owner_email=owner.email,
                    owner_name=owner.name,
                    document_title=document.title,
                    signer_name=signer_email
                )

            all_signers_final = db.query(DocumentSigner).filter(
                   DocumentSigner.document_id == document_id
            ).all()
            for s in all_signers_final:
                download_url = f"{BACKEND_URL}/api/documents/public/{s.signing_token}/download-signed"
                await send_signer_download_email(
                    to_email=s.signer_email,
                    to_name=s.signer_name or s.signer_email,
                    document_title=document.title,
                    download_url=download_url,
                   )

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

        return {
            "message": "Document fully signed by all signers",
            "status": "signed",
            "all_signed": True
        }

    else:

        pending_signers = [s for s in all_signers if s.status == "pending"]
        if pending_signers:
            await notify_next_signer(document_id, db)

        create_audit_log(
            db=db,
            action=AuditActions.DOCUMENT_FINALIZED,
            description=f"Signature recorded by {signer_email}. {len(pending_signers)} signer(s) remaining.",
            document_id=document.id,
            user_id=document.owner_id,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )

        return {
            "message": f"Signature recorded. {len(pending_signers)} signer(s) still pending.",
            "status": "pending",
            "all_signed": False,
            "pending_count": len(pending_signers)
        }

class SignerCreateInput(BaseModel):
    signer_name: str
    signer_email: str
    signing_order: int = 0

class MultipleSigningRequestInput(BaseModel):
    signers: List[SignerCreateInput]
    custom_message: Optional[str] = None
    enable_signing_order: bool = False

@router.post("/{document_id}/send-multiple-signing-requests")
async def send_multiple_signing_requests(
    document_id: int,
    request_data: MultipleSigningRequestInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    db.query(DocumentSigner).filter(DocumentSigner.document_id == document_id).delete()
    db.commit()

    created_signers = []
    for signer_data in request_data.signers:
        token = generate_signing_token(document_id, signer_data.signer_email)
        token_expires_at = datetime.utcnow() + timedelta(hours=int(os.getenv("SIGNING_TOKEN_EXPIRE_HOURS", 72)))

        document_signer = DocumentSigner(
            document_id=document_id,
            signer_name=signer_data.signer_name,
            signer_email=signer_data.signer_email,
            signing_order=signer_data.signing_order if request_data.enable_signing_order else 0,
            signing_token=token,
            token_expires_at=token_expires_at,
            status="pending"
        )
        db.add(document_signer)
        created_signers.append(document_signer)

    db.commit()

    successful_sends = 0
    failed_sends = []

    for signer in created_signers:
        if request_data.enable_signing_order and signer.signing_order > 1:
            continue

        try:
            success = await send_signing_request_email(
                signer_email=signer.signer_email,
                signer_name=signer.signer_name,
                document_title=document.title,
                document_id=document.id,
                sender_name=current_user.name,
                custom_message=request_data.custom_message
            )

            if success:
                successful_sends += 1
            else:
                failed_sends.append(signer.signer_email)
        except Exception as e:
            print(f"Failed to send email to {signer.signer_email}: {e}")
            failed_sends.append(signer.signer_email)

    create_audit_log(
        db=db,
        action=AuditActions.SIGNING_REQUEST_SENT,
        description=f"Signing requests sent to {len(created_signers)} signers for document: {document.title}",
        user_id=current_user.id,
        document_id=document_id,
        ip_address=None,
        user_agent=None
    )

    return {
        "message": f"Signing requests sent",
        "total_signers": len(created_signers),
        "successful_sends": successful_sends,
        "failed_sends": failed_sends,
        "signing_order_enabled": request_data.enable_signing_order
    }

@router.get("/{document_id}/signers", response_model=List[SignerResponse])
def get_document_signers(
        document_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    signers = db.query(DocumentSigner).filter(
        DocumentSigner.document_id == document_id
    ).order_by(DocumentSigner.signing_order).all()

    return signers


class RejectDocumentInput(BaseModel):
    reason: str

@router.post("/public/{token}/reject")
async def reject_public_document(
    token: str,
    rejection_data: RejectDocumentInput,
    request: Request,
    db: Session = Depends(get_db)
):
    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired signing link"
        )

    document_id = payload.get("document_id")
    signer_email = payload.get("signer_email")

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    signer = db.query(DocumentSigner).filter(
        DocumentSigner.document_id == document_id,
        DocumentSigner.signer_email == signer_email
    ).first()

    if signer:
        signer.status = "rejected"
        signer.rejection_reason = rejection_data.reason
        signer.rejected_at = datetime.utcnow()
        db.commit()

    document.status = DocumentStatus.REJECTED
    db.commit()

    create_audit_log(
        db=db,
        action=AuditActions.DOCUMENT_REJECTED,
        description=f"Document rejected by {signer_email}. Reason: {rejection_data.reason}",
        document_id=document.id,
        user_id=document.owner_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )

    owner = db.query(User).filter(User.id == document.owner_id).first()
    if owner:
        await send_document_rejected_email(
            owner_email=owner.email,
            owner_name=owner.name,
            document_title=document.title,
            signer_email=signer_email,
            rejection_reason=rejection_data.reason
        )

    return {
        "message": "Document rejected successfully",
        "reason": rejection_data.reason
    }

async def notify_next_signer(document_id: int, db: Session):

    next_signer = db.query(DocumentSigner).filter(
        DocumentSigner.document_id == document_id,
        DocumentSigner.status == "pending"
    ).order_by(DocumentSigner.signing_order).first()

    if not next_signer:
        return False

    document = db.query(Document).filter(Document.id == document_id).first()
    owner = db.query(User).filter(User.id == document.owner_id).first()

    if not document or not owner:
        return False

    try:
        success = await send_signing_request_email(
            signer_email=next_signer.signer_email,
            signer_name=next_signer.signer_name,
            document_title=document.title,
            document_id=document.id,
            sender_name=owner.name,
            custom_message=None
        )
        return success
    except Exception as e:
        print(f"Failed to notify next signer: {e}")
        return False
































