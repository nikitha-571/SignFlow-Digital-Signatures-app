from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    SIGNED = "signed"
    REJECTED = "rejected"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Path to uploaded PDF
    signed_file_path = Column(String(500), nullable=True)  # Path to signed PDF
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="documents")
    signatures = relationship("Signature", back_populates="document", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="document", cascade="all, delete-orphan")
    signers = relationship("DocumentSigner", back_populates="document", cascade="all, delete-orphan")