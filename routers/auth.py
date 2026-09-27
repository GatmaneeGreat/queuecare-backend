from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import database, models, schemas, security

router = APIRouter(prefix="/auth", tags=["Authentication"])

# 1. สมัครสมาชิก (Register)
@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserRegister, db: Session = Depends(database.get_db)):
    # เช็กว่าอีเมลซ้ำไหม
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash Password ก่อนบันทึกลงฐานข้อมูล
    hashed_pwd = security.hash_password(user_data.password)
    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_pwd,
        role=user_data.role or "customer"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# 2. เข้าสู่ระบบ (Login) เพื่อรับ Token
@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = security.create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

# 3. ดูข้อมูลผู้ใช้ปัจจุบันที่ล็อกอินอยู่ (ทำไว้เพิ่มปุ่ม Authorize ใน Swagger UI และทดสอบ Token)
@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user