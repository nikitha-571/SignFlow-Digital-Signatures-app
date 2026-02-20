import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class SignatureStatus(str, enum.Enum):
    PENDING = "pending"
    SIGNED = "signed"


class SignatureType(str, enum.Enum):
    SIGNATURE = "signature"
    INITIALS = "initials"
    NAME = "name"
    DATE = "date"
    TEXT = "text"
    STAMP = "stamp"


class Signature(Base):
    __tablename__ = "signatures"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    signer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page_number = Column(Integer, nullable=False)
    x_position = Column(Float, nullable=False)
    y_position = Column(Float, nullable=False)
    width = Column(Float, default=150.0)
    height = Column(Float, default=50.0)
    signature_text = Column(String(500), nullable=True)
    signature_image_path = Column(String(500), nullable=True)
    signature_font = Column(String(100), default="cursive")
    signature_type = Column(String(20), default="signature")
    status = Column(SQLEnum(SignatureStatus), default=SignatureStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    signed_at = Column(DateTime(timezone=True), nullable=True)

    document = relationship("Document", back_populates="signatures")
    signer = relationship("User")