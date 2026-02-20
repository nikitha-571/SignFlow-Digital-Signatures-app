from sqlalchemy.orm import Session
from models.audit_log import AuditLog
from datetime import datetime
from typing import Optional


def create_audit_log(
        db: Session,
        action: str,
        description: str,
        user_id: Optional[int] = None,
        document_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
):
    audit_log = AuditLog(
        action=action,
        description=description,
        user_id=user_id,
        document_id=document_id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()
    return audit_log

class AuditActions:
    USER_REGISTERED = "USER_REGISTERED"
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"

    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_VIEWED = "DOCUMENT_VIEWED"
    DOCUMENT_DOWNLOADED = "DOCUMENT_DOWNLOADED"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"
    DOCUMENT_FINALIZED = "DOCUMENT_FINALIZED"
    DOCUMENT_REJECTED = "document_rejected"

    SIGNATURE_CREATED = "SIGNATURE_CREATED"
    SIGNATURE_SIGNED = "SIGNATURE_SIGNED"
    SIGNATURE_DELETED = "SIGNATURE_DELETED"
    SIGNATURE_POSITION_UPDATED = "SIGNATURE_POSITION_UPDATED"

    SIGNING_REQUEST_SENT = "SIGNING_REQUEST_SENT"
    SIGNED_PDF_SENT = "SIGNED_PDF_SENT"

    PUBLIC_DOCUMENT_ACCESSED = "PUBLIC_DOCUMENT_ACCESSED"
    PUBLIC_SIGNATURE_ADDED = "PUBLIC_SIGNATURE_ADDED"