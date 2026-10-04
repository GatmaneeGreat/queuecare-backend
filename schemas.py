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


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
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


class QueueStatusUpdate(BaseModel):
    status: str  # waiting, serving, completed, cancelled


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


# ========================================================
# โค้ดส่วนใหม่ที่เพิ่มต่อท้าย
# ========================================================
from pydantic import Field


# --- TRANSACTION SCHEMAS ---
class TransactionCreate(BaseModel):
    queue_id: int
    amount: int
    status: Optional[str] = "pending"


class TransactionResponse(BaseModel):
    id: int
    queue_id: int
    amount: int
    status: str

    class Config:
        from_attributes = True


# --- REVIEW SCHEMAS ---
class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="คะแนน 1 ถึง 5 ดาว")
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    rating: int
    comment: Optional[str] = None

    class Config:
        from_attributes = True