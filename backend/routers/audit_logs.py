from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.audit_log import AuditLog
from middleware.auth_middleware import get_current_user
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])


@router.get("/")
def get_audit_logs(
        document_id: Optional[int] = None,
        action: Optional[str] = None,
        days: int = Query(default=30, ge=1, le=365),
        limit: int = Query(default=100, ge=1, le=1000),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    since_date = datetime.utcnow() - timedelta(days=days)

    query = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.created_at >= since_date
    )

    if document_id:
        query = query.filter(AuditLog.document_id == document_id)

    if action:
        query = query.filter(AuditLog.action == action)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    return {
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "description": log.description,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "document_id": log.document_id,
                "created_at": log.created_at
            }
            for log in logs
        ]
    }


@router.get("/document/{document_id}")
def get_document_audit_logs(
        document_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    from models.document import Document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    logs = db.query(AuditLog).filter(
        AuditLog.document_id == document_id
    ).order_by(AuditLog.created_at.desc()).all()

    return {
        "document_id": document_id,
        "document_title": document.title,
        "total_logs": len(logs),
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "description": log.description,
                "ip_address": log.ip_address,
                "created_at": log.created_at
            }
            for log in logs
        ]
    }


@router.get("/summary")
def get_audit_summary(
        days: int = Query(default=7, ge=1, le=365),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    since_date = datetime.utcnow() - timedelta(days=days)

    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.created_at >= since_date
    ).all()

    action_counts = {}
    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1

    return {
        "period_days": days,
        "total_activities": len(logs),
        "action_breakdown": action_counts,
        "most_recent": logs[0].created_at if logs else None
    }