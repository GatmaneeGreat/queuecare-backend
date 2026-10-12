import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"  # ป้องกัน C-Extension Error บน Windows

from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from database import get_db, engine, SessionLocal
import models
import schemas
from routers import auth, services, queues, transactions, reviews

# สั่งสร้างตาราง Database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="QueueCare API")
app.mount(
    "/static",
    StaticFiles(
        directory=str(Path(__file__).resolve().parent / "static")
    ),
    name="static",
)

# ========================================================
# AUTO-SETUP & AUTO-SEED ON STARTUP (ระบบสร้างข้อมูลอัตโนมัติ)
# ========================================================
@app.on_event("startup")
def auto_setup_and_seed():
    db = SessionLocal()
    try:
        # 1. Auto-Heal: ซ่อมตาราง queues เพิ่มคอลัมน์ share_token ถ้ายังไม่มี
        db.execute(text("""
            ALTER TABLE queues 
            ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);
        """))
        db.commit()

        # 2. Auto-Seed: ยูสเซอร์พยาบาล (nurse@hospital.com)
        nurse_user = db.query(models.User).filter(models.User.email == "nurse@hospital.com").first()
        if not nurse_user:
            try:
                hashed_pw = auth.get_password_hash("password123")
            except AttributeError:
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                hashed_pw = pwd_context.hash("password123")

            new_nurse = models.User(
                name="Nurse Station",
                email="nurse@hospital.com",
                hashed_password=hashed_pw,
                role="nurse"
            )
            db.add(new_nurse)
            db.commit()

        # 3. Auto-Seed: แผนกบริการ (Services) รวม 8 แผนก
        default_services = [
            {"id": 1, "name": "แผนกอายุรกรรม (General Medical)"},
            {"id": 2, "name": "แผนกศัลยกรรม (Surgery)"},
            {"id": 3, "name": "แผนกกุมารเวชกรรม (Pediatrics)"},
            {"id": 4, "name": "แผนกสูตินรีเวชกรรม (Obstetrics & Gynecology)"},
            {"id": 5, "name": "แผนกจักษุวิทยา (Ophthalmology)"},
            {"id": 6, "name": "แผนกทันตกรรม (Dental Clinic)"},
            {"id": 7, "name": "แผนกกระดูกและข้อ (Orthopedics)"},
            {"id": 8, "name": "แผนกอุบัติเหตุและฉุกเฉิน (Emergency Room)"}
        ]
        for s in default_services:
            existing = db.query(models.Service).filter(models.Service.id == s["id"]).first()
            if not existing:
                new_service = models.Service(id=s["id"], name=s["name"])
                db.add(new_service)
        db.commit()

        print("🟢 [System Ready] Database auto-healed & seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"🔴 [Startup Error] Auto setup failed: {e}")
    finally:
        db.close()


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
# FRONTEND PAGES (ปรับให้ / เปิดหน้ารอโหลด แล้วเด้งไป /home)
# ========================================================

@app.get("/")
@app.get("/splash")
def splash_page(request: Request):
    """หน้าแรกสุดของคนไข้: หน้ารอโหลด (Splash Screen)"""
    return templates.TemplateResponse(
        request=request, 
        name="splash.html"
    )

@app.get("/home")
def home_page(request: Request):
    """หน้าหลักคนไข้: เลือกแพ็กเกจ / สแกน QR / ค้นหาชื่อ (index.html)"""
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
    """หน้าติดตามคิวสำหรับคนไข้"""
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