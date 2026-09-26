from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# --- USER SCHEMAS ---
class UserCreate(BaseModel):
    name: str
    email: str
    role: Optional[str] = "customer"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True

# --- QUEUE SCHEMAS ---
class QueueCreate(BaseModel):
    number: str
    user_id: int
    service_id: Optional[int] = None

class QueueResponse(BaseModel):
    id: int
    number: str
    status: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True