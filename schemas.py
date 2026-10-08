from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# =========================================================
# AUTH & USER
# =========================================================

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


# =========================================================
# SERVICE
# =========================================================

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


# =========================================================
# QUEUE
# =========================================================

class QueueCreate(BaseModel):
    number: str
    user_id: int
    service_id: Optional[int] = None


class QueueUpdate(BaseModel):
    status: str


class QueueStatusUpdate(BaseModel):
    status: str


class QueueResponse(BaseModel):
    id: int
    number: str
    status: str
    user_id: int
    service_id: Optional[int] = None
    created_at: datetime
    share_token: Optional[str] = None

    user: Optional[UserResponse] = None
    service: Optional[ServiceResponse] = None

    class Config:
        from_attributes = True


# =========================================================
# PUBLIC QUEUE RESPONSE
# ใช้สำหรับหน้า /track
# =========================================================

class PublicQueueResponse(BaseModel):
    id: int
    number: str
    status: str
    user_id: int
    service_id: Optional[int] = None
    created_at: datetime
    share_token: Optional[str] = None

    user: Optional[UserResponse] = None
    service: Optional[ServiceResponse] = None

    # จำนวนคิวที่อยู่ก่อนหน้าคิวนี้
    ahead_count: int = 0

    # เลขคิวที่กำลังให้บริการ
    current_serving_number: Optional[str] = None

    class Config:
        from_attributes = True


# =========================================================
# TRANSACTION
# =========================================================

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


# =========================================================
# REVIEW
# =========================================================

class ReviewCreate(BaseModel):
    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="คะแนน 1 ถึง 5 ดาว"
    )
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    rating: int
    comment: Optional[str] = None

    class Config:
        from_attributes = True