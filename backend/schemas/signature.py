from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SignatureCreate(BaseModel):
    document_id: int
    page_number: int
    x_position: float
    y_position: float
    width: Optional[float] = 150.0
    height: Optional[float] = 50.0
    signature_type: Optional[str] = "signature"


class SignatureSign(BaseModel):
    signature_text: Optional[str] = None
    signature_image_base64: Optional[str] = None
    signature_font: Optional[str] = "cursive"


class SignatureResponse(BaseModel):
    id: int
    document_id: int
    signer_id: int
    page_number: int
    x_position: float
    y_position: float
    width: float
    height: float
    signature_text: Optional[str]
    signature_image_path: Optional[str]
    signature_font: Optional[str]
    signature_type: Optional[str]
    status: str
    created_at: datetime
    signed_at: Optional[datetime]
    signer_name: Optional[str] = None
    signer_email: Optional[str] = None

class Config:
        from_attributes = True