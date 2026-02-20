from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class SignerCreate(BaseModel):
    signer_name: str
    signer_email: EmailStr
    signing_order: int = 0


class SignerResponse(BaseModel):
    id: int
    document_id: int
    signer_name: str
    signer_email: str
    signing_order: int
    status: str
    signed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True