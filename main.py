from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from database import get_db, engine
import models
import schemas
from routers import auth, services, queues  # นำเข้า routers ทั้งหมด

# สั่งสร้างตาราง
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="QueueCare API")

# ลงทะเบียน Routers เข้ากับ App หลัก
app.include_router(auth.router)
app.include_router(services.router)
app.include_router(queues.router)

@app.get("/")
def read_root():
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