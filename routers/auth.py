
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import database
import models
import schemas
import security

router = APIRouter(prefix="/auth", tags=["Authentication"])


# 1. Register: ผู้สมัครใหม่เป็น customer เท่านั้น
@router.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user_data: schemas.UserRegister,
    db: Session = Depends(database.get_db)
):
    name = user_data.name.strip()
    email = str(user_data.email).strip().lower()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="กรุณาระบุชื่อ"
        )

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_pwd = security.hash_password(user_data.password)

    new_user = models.User(
        name=name,
        email=email,
        hashed_password=hashed_pwd,
        role="customer"
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ไม่สามารถสมัครสมาชิกได้ในขณะนี้"
        )

    return new_user


# 2. Login: รับ Access Token
@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    email = form_data.username.strip().lower()

    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if not user or not security.verify_password(
        form_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = security.create_access_token(
        data={"sub": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# 3. ข้อมูลผู้ใช้ที่กำลังเข้าสู่ระบบ
@router.get("/me", response_model=schemas.UserResponse)
def get_me(
    current_user: models.User = Depends(security.get_current_user)
):
    return current_user
