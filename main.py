from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from database import get_db, engine
import models
import schemas
from routers import auth, services, queues, transactions, reviews

# สั่งสร้างตาราง Database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="QueueCare API")

# ตั้งค่าโฟลเดอร์ templates
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# ลงทะเบียน Routers ทั้งหมด
app.include_router(auth.router)
app.include_router(services.router)
app.include_router(queues.router)
app.include_router(transactions.router)
app.include_router(reviews.router)


# ========================================================
# FRONTEND PAGES
# ========================================================

@app.get("/")
def home_page(request: Request):
    """หน้าแรก: เข้าสู่ระบบ / เลือกประเภทบริการ (ธรรมดา / โปร)"""
    return templates.TemplateResponse(
        request=request, 
        name="index.html"
    )

@app.get("/nurse")
def nurse_page(request: Request):
    """หน้าพยาบาล: ออกบัตรคิวผู้ป่วยใหม่และพิมพ์ QR Code"""
    return templates.TemplateResponse(
        request=request, 
        name="nurse.html"
    )

@app.get("/track")
@app.get("/track/{token}")
def track_page(request: Request, token: Optional[str] = ""):
    """หน้าติดตามคิวสาธารณะ: รองรับทั้ง Query String (?q=A-001) และ Path Parameter (/track/token)"""
    return templates.TemplateResponse(
        request=request, 
        name="track.html", 
        context={"token": token}
    )


# ========================================================
# BACKEND API ENDPOINTS
# ========================================================

@app.get("/api-status")
def api_status():
    return {"message": "Welcome to QueueCare API"}

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT NOW()")).fetchone()
        return {"status": "success", "db_time": str(result[0])}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- USER ENDPOINTS ---
@app.post("/users", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(name=user.name, email=user.email, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()