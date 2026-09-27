from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from database import get_db, engine
import models
import schemas

# สั่งสร้างตาราง
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="QueueCare API")

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

# --- QUEUE ENDPOINTS ---
@app.post("/queues", response_model=schemas.QueueResponse, status_code=status.HTTP_201_CREATED)
def create_queue(queue: schemas.QueueCreate, db: Session = Depends(get_db)):
    new_queue = models.Queue(
        number=queue.number,
        user_id=queue.user_id,
        service_id=queue.service_id
    )
    db.add(new_queue)
    db.commit()
    db.refresh(new_queue)
    return new_queue

@app.get("/queues", response_model=List[schemas.QueueResponse])
def get_queues(db: Session = Depends(get_db)):
    return db.query(models.Queue).all()

# --- SERVICE ENDPOINTS ---

@app.post("/services", response_model=schemas.ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db)):
    new_service = models.Service(
        name=service.name,
        description=service.description
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return new_service

@app.get("/services", response_model=List[schemas.ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()


# --- QUEUE MANAGEMENT ENDPOINTS ---

@app.patch("/queues/{queue_id}/status", response_model=schemas.QueueResponse)
def update_queue_status(queue_id: int, status_data: schemas.QueueStatusUpdate, db: Session = Depends(get_db)):
    queue = db.query(models.Queue).filter(models.Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="ไม่พบคิวนี้ในระบบ")
    
    queue.status = status_data.status
    db.commit()
    db.refresh(queue)
    return queue

@app.post("/queues/next", response_model=schemas.QueueResponse)
def call_next_queue(service_id: int, db: Session = Depends(get_db)):
    next_queue = db.query(models.Queue)\
                   .filter(models.Queue.service_id == service_id, models.Queue.status == "waiting")\
                   .order_by(models.Queue.id.asc())\
                   .first()
    
    if not next_queue:
        raise HTTPException(status_code=404, detail="There are no waiting queues for this servicecd")
    
    next_queue.status = "serving"
    db.commit()
    db.refresh(next_queue)
    return next_queue