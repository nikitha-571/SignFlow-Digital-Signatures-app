from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class DocumentSigner(Base):
    __tablename__ = "document_signers"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    signer_name = Column(String(255), nullable=False)
    signer_email = Column(String(255), nullable=False)
    signing_order = Column(Integer, default=0)
    status = Column(String(50), default="pending")
    signed_at = Column(DateTime, nullable=True)
    signing_token = Column(String(500), unique=True, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    document = relationship("Document", back_populates="signers")