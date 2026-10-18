
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


# =========================================================
# AUTH & USER
# =========================================================

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    hospital_id: int = Field(..., gt=0)


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "customer"
    position: Optional[str] = None
    hospital_id: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    position: Optional[str] = None
    hospital_id: Optional[int] = None
    approval_status: str = "approved"

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# =========================================================
# NURSE APPROVAL
# =========================================================

class NurseDecision(BaseModel):
    approval_status: Literal["approved", "rejected"]
    position: Optional[str] = Field(default=None, max_length=100)


# =========================================================
# HOSPITAL & SUBSCRIPTION
# =========================================================

class HospitalCreate(BaseModel):
    name: str
    package: str = "free"


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    package: Optional[str] = None
    subscription_status: Optional[str] = None


class HospitalResponse(BaseModel):
    id: int
    name: str
    package: str
    subscription_status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================================================
# HOSPITAL ADMIN
# =========================================================

class HospitalAdminCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    hospital_id: int = Field(..., gt=0)


# =========================================================
# HOSPITAL NURSE UPDATE
# =========================================================

class HospitalNurseUpdate(BaseModel):
    position: Optional[str] = Field(default=None, max_length=100)
    service_id: Optional[int] = Field(default=None, gt=0)


# =========================================================
# NURSE PROFILE
# =========================================================

class NurseProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    position: Optional[str] = None
    hospital_id: Optional[int] = None
    hospital_name: Optional[str] = None
    package: Optional[str] = None
    subscription_status: Optional[str] = None
    approval_status: str = "approved"

    class Config:
        from_attributes = True


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
    patient_name: Optional[str] = None


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
# =========================================================

class PublicUserResponse(BaseModel):
    name: str

    class Config:
        from_attributes = True


class PublicQueueResponse(BaseModel):
    id: int
    number: str
    status: str
    service_id: Optional[int] = None
    created_at: datetime

    user: Optional[PublicUserResponse] = None
    service: Optional[ServiceResponse] = None

    ahead_count: int = 0
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
        description="คะแนน 1 ถึง 5 ดาว",
    )
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    rating: int
    comment: Optional[str] = None

    class Config:
        from_attributes = True

# ========================================================
# SUBSCRIPTION PAYMENT
# ========================================================

class SubscriptionPaymentCreate(BaseModel):
    payment_method: Literal["promptpay_demo"] = "promptpay_demo"


class SubscriptionPaymentResponse(BaseModel):
    id: int
    hospital_id: int
    amount: int
    package: str
    payment_method: str
    reference: Optional[str] = None
    status: str
    is_demo: bool
    created_at: datetime
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HospitalSubscriptionResponse(BaseModel):
    hospital_id: int
    hospital_name: str
    package: str
    subscription_status: str
    subscription_started_at: Optional[datetime] = None
    subscription_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

