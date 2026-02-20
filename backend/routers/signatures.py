from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import User
from models.document_signer import DocumentSigner
from models.document import Document, DocumentStatus
from models.signature import Signature, SignatureStatus
from schemas.signature import SignatureCreate, SignatureSign, SignatureResponse
from services.audit_service import create_audit_log, AuditActions
from services.email_service import verify_signing_token
from middleware.auth_middleware import get_current_user
from fastapi.responses import FileResponse
from typing import List, Optional
import base64
import os
from datetime import datetime

router = APIRouter(prefix="/api/signatures", tags=["Signatures"])


class PublicSignatureCreate(BaseModel):
    page_number: int
    x_position: float
    y_position: float
    width: float = 150.0
    height: float = 50.0
    signature_type: str = "signature"

def _get_signature_with_auth(
    signature_id: int,
    current_user: User,
    db: Session,
    *,
    require_owner: bool = False,
) -> Signature:

    signature = db.query(Signature).filter(Signature.id == signature_id).first()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found",
        )

    document = db.query(Document).filter(Document.id == signature.document_id).first()

    is_signer = signature.signer_id == current_user.id
    is_owner  = document is not None and document.owner_id == current_user.id

    if require_owner:
        if not is_owner:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    else:
        if not is_signer and not is_owner:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return signature

@router.post("/", response_model=SignatureResponse, status_code=status.HTTP_201_CREATED)
def create_signature_placeholder(
        signature_data: SignatureCreate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == signature_data.document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    signature_type = signature_data.signature_type if hasattr(signature_data, 'signature_type') else 'signature'

    print(f"🔍 Creating signature with type: {signature_type}")

    new_signature = Signature(
        document_id=signature_data.document_id,
        signer_id=current_user.id,
        page_number=signature_data.page_number,
        x_position=signature_data.x_position,
        y_position=signature_data.y_position,
        width=signature_data.width,
        height=signature_data.height,
        signature_type=signature_type,
        status=SignatureStatus.PENDING
    )

    db.add(new_signature)
    db.commit()
    db.refresh(new_signature)

    print(f"✅ Signature created with ID: {new_signature.id}, Type: {new_signature.signature_type}")

    return new_signature


@router.get("/document/{document_id}", response_model=List[SignatureResponse])
def get_document_signatures(
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
        Signature.document_id == document_id
    ).all()

    result = []
    for sig in signatures:
        signer_user = sig.signer
        signer_name = None
        if signer_user:
            doc_signer = db.query(DocumentSigner).filter(
                DocumentSigner.document_id == document_id,
                DocumentSigner.signer_email == signer_user.email
            ).first()
            if doc_signer and doc_signer.signer_name:
                signer_name = doc_signer.signer_name
            else:
                signer_name = signer_user.name
        result.append({
            "id": sig.id,
            "document_id": sig.document_id,
            "signer_id": sig.signer_id,
            "page_number": sig.page_number,
            "x_position": sig.x_position,
            "y_position": sig.y_position,
            "width": sig.width,
            "height": sig.height,
            "signature_type": sig.signature_type,
            "status": sig.status.value if hasattr(sig.status, "value") else sig.status,
            "created_at": sig.created_at.isoformat() if sig.created_at else None,
            "signed_at": sig.signed_at.isoformat() if sig.signed_at else None,
            "signature_text": sig.signature_text,
            "signature_image_path": sig.signature_image_path,
            "signature_font": sig.signature_font,
            "signer_name": signer_name,
            "signer_email": signer_user.email if signer_user else None,
        })
    return result


@router.post("/{signature_id}/sign", response_model=SignatureResponse)
def sign_signature(
        signature_id: int,
        signature_sign: SignatureSign,
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.signer_id == current_user.id
    ).first()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature placeholder not found"
        )

    if signature_sign.signature_text:
        signature.signature_text = signature_sign.signature_text
        signature.signature_font = signature_sign.signature_font or "cursive"

    if signature_sign.signature_image_base64:
        try:
            image_data = base64.b64decode(signature_sign.signature_image_base64)
            signatures_dir = "./signatures"
            os.makedirs(signatures_dir, exist_ok=True)

            image_filename = f"signature_{signature_id}_{int(datetime.now().timestamp())}.png"
            image_path = os.path.join(signatures_dir, image_filename)

            with open(image_path, "wb") as f:
                f.write(image_data)

            signature.signature_image_path = image_path
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to save signature image: {str(e)}"
            )

    signature.status = SignatureStatus.SIGNED
    signature.signed_at = datetime.utcnow()

    db.commit()
    db.refresh(signature)

    create_audit_log(
        db=db,
        action=AuditActions.SIGNATURE_SIGNED,
        description=f"Signature signed on document",
        user_id=current_user.id,
        document_id=signature.document_id,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None
    )

    return signature


@router.put("/{signature_id}/position")
def update_signature_position(
        signature_id: int,
        x_position: float,
        y_position: float,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.signer_id == current_user.id
    ).first()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    document = db.query(Document).filter(Document.id == signature.document_id).first()
    is_signer = signature.signer_id == current_user.id
    is_owner = document and document.owner_id == current_user.id
    if not is_signer and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    signature.x_position = max(0.0, min(0.95, x_position))
    signature.y_position = max(0.0, min(0.95, y_position))

    db.commit()

    return {
        "success": True,
        "message": "Position updated",
        "x_position": signature.x_position,
        "y_position": signature.y_position
    }

@router.put("/{signature_id}/size")
def update_signature_size(
        signature_id: int,
        width: float = Query(...),
        height: float = Query(...),
        x_position: float = Query(...),
        y_position: float = Query(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    signature = db.query(Signature).filter(
        Signature.id == signature_id
    ).first()

    if not signature:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signature not found")

    document = db.query(Document).filter(Document.id == signature.document_id).first()
    is_signer = signature.signer_id == current_user.id
    is_owner = document and document.owner_id == current_user.id
    if not is_signer and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    signature.width      = max(0.04, min(0.98, width))
    signature.height     = max(0.02, min(0.98, height))
    signature.x_position = max(0.0,  min(0.96, x_position))
    signature.y_position = max(0.0,  min(0.96, y_position))
    db.commit()

    return {
        "success": True,
        "width":      signature.width,
        "height":     signature.height,
        "x_position": signature.x_position,
        "y_position": signature.y_position,
    }


@router.get("/{signature_id}/image")
def get_signature_image(
        signature_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    signature = db.query(Signature).filter(
        Signature.id == signature_id
    ).first()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    if not signature.signature_image_path or not os.path.exists(signature.signature_image_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature image not found"
        )

    return FileResponse(
        path=signature.signature_image_path,
        media_type="image/png",
        headers={
            "Access-Control-Allow-Origin": "*",
        }
    )


@router.delete("/{signature_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_signature(
        signature_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.signer_id == current_user.id
    ).first()



    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    document = db.query(Document).filter(Document.id == signature.document_id).first()
    is_signer = signature.signer_id == current_user.id
    is_owner = document and document.owner_id == current_user.id
    if not is_signer and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if signature.signature_image_path and os.path.exists(signature.signature_image_path):
        os.remove(signature.signature_image_path)

    db.delete(signature)
    db.commit()

    return None


@router.get("/public/{token}")
def get_public_signatures(
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

    signatures = db.query(Signature).filter(
        Signature.document_id == document_id
    ).all()

    result = []
    for sig in signatures:
        signer_user = sig.signer

        signer_name = None
        if signer_user:
            doc_signer = db.query(DocumentSigner).filter(
                DocumentSigner.document_id == document_id,
                DocumentSigner.signer_email == signer_user.email
            ).first()
            if doc_signer and doc_signer.signer_name:
                signer_name = doc_signer.signer_name
            else:
                signer_name = signer_user.name

        result.append({
            "id": sig.id,
            "document_id": sig.document_id,
            "signer_id": sig.signer_id,
            "page_number": sig.page_number,
            "x_position": sig.x_position,
            "y_position": sig.y_position,
            "width": sig.width,
            "height": sig.height,
            "signature_type": sig.signature_type,
            "status": sig.status.value if hasattr(sig.status, "value") else sig.status,
            "created_at": sig.created_at.isoformat() if sig.created_at else None,
            "signed_at": sig.signed_at.isoformat() if sig.signed_at else None,
            "signature_text": sig.signature_text,
            "signature_image_path": sig.signature_image_path,
            "signature_font": sig.signature_font,
            "signer_name": signer_name,
            "signer_email": signer_user.email if signer_user else None,
        })

    return result

@router.post("/public/{token}")
def create_public_signature(
        token: str,
        signature_data: PublicSignatureCreate,
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
    signer_email = payload.get("signer_email")

    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    signer = db.query(User).filter(User.email == signer_email).first()

    if not signer:
        signer = User(
            name=signer_email.split('@')[0].capitalize(),
            email=signer_email,
            password="public_signer"
        )
        db.add(signer)
        db.commit()
        db.refresh(signer)

    print(f"🔍 PUBLIC: Creating signature with type: {signature_data.signature_type}")

    signature = Signature(
        document_id=document_id,
        signer_id=signer.id,
        page_number=signature_data.page_number,
        x_position=signature_data.x_position,
        y_position=signature_data.y_position,
        width=signature_data.width,
        height=signature_data.height,
        signature_type=signature_data.signature_type,
        status=SignatureStatus.PENDING
    )

    db.add(signature)
    db.commit()
    db.refresh(signature)

    print(f"✅ PUBLIC: Signature created with ID: {signature.id}, Type: {signature.signature_type}")

    create_audit_log(
        db=db,
        action=AuditActions.PUBLIC_SIGNATURE_ADDED,
        description=f"Signature placeholder added by {signer_email} via public link",
        document_id=document_id,
        user_id=signer.id
    )

    return signature


@router.post("/public/{token}/{signature_id}/sign")
def sign_public_signature(
        token: str,
        signature_id: int,
        signature_data: SignatureSign,
        db: Session = Depends(get_db)
):
    from services.email_service import verify_signing_token

    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired signing link"
        )

    signature = db.query(Signature).filter(Signature.id == signature_id).first()
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    document_id = signature.document_id

    if signature_data.signature_image_base64:
        try:
            image_data = base64.b64decode(signature_data.signature_image_base64)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"signature_{signature_id}_{timestamp}.png"
            filepath = os.path.join("./signatures", filename)

            os.makedirs("./signatures", exist_ok=True)

            with open(filepath, "wb") as f:
                f.write(image_data)

            signature.signature_image_path = filepath
        except Exception as e:
            print(f"Error saving signature image: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save signature image"
            )

    signature.signature_text = signature_data.signature_text
    signature.signature_font = signature_data.signature_font
    signature.status = SignatureStatus.SIGNED
    signature.signed_at = datetime.utcnow()

    db.commit()
    db.refresh(signature)

    signer_email = payload.get("signer_email")
    signer = db.query(User).filter(User.email == signer_email).first()

    create_audit_log(
        db=db,
        action=AuditActions.SIGNATURE_SIGNED,
        description=f"Signature signed by {signer_email} via public link",
        document_id=document_id,
        user_id=signer.id if signer else None
    )

    return {
        "id": signature.id,
        "document_id": signature.document_id,
        "signer_id": signature.signer_id,
        "page_number": signature.page_number,
        "x_position": signature.x_position,
        "y_position": signature.y_position,
        "width": signature.width,
        "height": signature.height,
        "signature_type": signature.signature_type,
        "status": signature.status.value if hasattr(signature.status, 'value') else signature.status,
        "created_at": signature.created_at.isoformat() if signature.created_at else None,
        "signed_at": signature.signed_at.isoformat() if signature.signed_at else None,
        "signature_text": signature.signature_text,
        "signature_image_path": signature.signature_image_path,
        "signature_font": signature.signature_font
    }

@router.put("/public/{token}/{signature_id}/size")
def update_public_signature_size(
    token: str,
    signature_id: int,
    width: float = Query(...),
    height: float = Query(...),
    x_position: float = Query(...),
    y_position: float = Query(...),
    db: Session = Depends(get_db)
):

    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired signing link")

    signature = db.query(Signature).filter(Signature.id == signature_id).first()
    if not signature:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signature not found")
    signature.width = max(0.05, min(0.95, width))
    signature.height = max(0.03, min(0.95, height))
    signature.x_position = max(0.0, min(0.95, x_position))
    signature.y_position = max(0.0, min(0.95, y_position))
    db.commit()

    return {
        "success": True,
        "width": signature.width,
        "height": signature.height,
        "x_position": signature.x_position,
        "y_position": signature.y_position,
    }

@router.delete("/public/{token}/{signature_id}")
def delete_public_signature(
        token: str,
        signature_id: int,
        db: Session = Depends(get_db)
):
    from services.email_service import verify_signing_token

    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired signing link"
        )

    signature = db.query(Signature).filter(Signature.id == signature_id).first()
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    document_id = signature.document_id
    if signature.signature_image_path and os.path.exists(signature.signature_image_path):
        os.remove(signature.signature_image_path)

    db.delete(signature)
    db.commit()

    signer_email = payload.get("signer_email")
    signer = db.query(User).filter(User.email == signer_email).first()

    create_audit_log(
        db=db,
        action=AuditActions.SIGNATURE_DELETED,
        description=f"Signature deleted by {signer_email} via public link",
        document_id=document_id,
        user_id=signer.id if signer else None
    )

    return {"message": "Signature deleted successfully"}


@router.put("/public/{token}/{signature_id}/position")
def update_public_signature_position(
        token: str,
        signature_id: int,
        x_position: float = Query(...),
        y_position: float = Query(...),
        db: Session = Depends(get_db)
):
    from services.email_service import verify_signing_token

    payload = verify_signing_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired signing link"
        )

    signature = db.query(Signature).filter(Signature.id == signature_id).first()
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )

    signature_dict = {
        "id": signature.id,
        "document_id": signature.document_id,
        "signer_id": signature.signer_id,
        "page_number": signature.page_number,
        "x_position": x_position,
        "y_position": y_position,
        "width": signature.width,
        "height": signature.height,
        "signature_type": signature.signature_type,
        "status": signature.status.value if hasattr(signature.status, 'value') else signature.status,
        "created_at": signature.created_at.isoformat() if signature.created_at else None,
        "signed_at": signature.signed_at.isoformat() if signature.signed_at else None,
        "signature_text": signature.signature_text,
        "signature_image_path": signature.signature_image_path,
        "signature_font": signature.signature_font
    }

    document_id = signature.document_id
    signature.x_position = x_position
    signature.y_position = y_position

    db.commit()

    signer_email = payload.get("signer_email")
    signer = db.query(User).filter(User.email == signer_email).first()

    create_audit_log(
        db=db,
        action=AuditActions.SIGNATURE_POSITION_UPDATED,
        description=f"Signature position updated by {signer_email} via public link",
        document_id=document_id,
        user_id=signer.id if signer else None
    )


    return signature_dict