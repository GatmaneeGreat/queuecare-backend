from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# --- AUTH & USER SCHEMAS ---
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "customer"


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "customer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# --- SERVICE SCHEMAS ---
class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


# --- QUEUE SCHEMAS ---
class QueueCreate(BaseModel):
    number: str
    user_id: int
    service_id: Optional[int] = None


class QueueUpdate(BaseModel):
    status: str  # สำหรับอัปเดตเป็น: waiting, serving, completed, cancelled


class QueueResponse(BaseModel):
    id: int
    number: str
    status: str
    user_id: int
    service_id: Optional[int] = None
    created_at: datetime

    # ดึงข้อมูลผู้ใช้และบริการติดมาด้วยได้
    user: Optional[UserResponse] = None
    service: Optional[ServiceResponse] = None

    class Config:
        from_attributes = True