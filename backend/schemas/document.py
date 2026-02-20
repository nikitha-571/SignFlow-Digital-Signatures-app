from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentResponse(BaseModel):
    id: int
    title: str
    original_filename: str
    file_path: str
    signed_file_path: Optional[str]
    status: str
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int