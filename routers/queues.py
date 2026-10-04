from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
import security  # 1. 🟢 เพิ่ม import security

router = APIRouter(
    prefix="/queues",
    tags=["Queues"]
)

# --- Create Queue (Protected: Authentication required 🔒) ---
@router.post("/", response_model=schemas.QueueResponse, status_code=status.HTTP_201_CREATED)
def create_queue(
    queue: schemas.QueueCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)  # 2. 🔒 เพิ่ม Auth
):
    new_queue = models.Queue(
        number=queue.number,
        user_id=current_user.id,  # ใช้ id ของผู้ใช้ที่ล็อกอินอยู่
        service_id=queue.service_id
    )
    db.add(new_queue)
    db.commit()
    db.refresh(new_queue)
    return new_queue

# --- Get All Queues (Protected: Authentication required 🔒) ---
@router.get("/", response_model=List[schemas.QueueResponse])
def get_queues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)  # 2. 🔒 เพิ่ม Auth
):
    return db.query(models.Queue).all()

# --- Update Queue Status (Protected: Authentication required 🔒) ---
@router.patch("/{queue_id}/status", response_model=schemas.QueueResponse)
def update_queue_status(
    queue_id: int, 
    status_data: schemas.QueueStatusUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)  # 2. 🔒 เพิ่ม Auth
):
    queue = db.query(models.Queue).filter(models.Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found")  # 3. 🌐 แปลเป็นอังกฤษ
    
    queue.status = status_data.status
    db.commit()
    db.refresh(queue)
    return queue

# --- Call Next Queue (Protected: Authentication required 🔒) ---
@router.post("/next", response_model=schemas.QueueResponse)
def call_next_queue(
    service_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)  # 2. 🔒 เพิ่ม Auth
):
    next_queue = db.query(models.Queue)\
                   .filter(models.Queue.service_id == service_id, models.Queue.status == "waiting")\
                   .order_by(models.Queue.id.asc())\
                   .first()
    
    if not next_queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="There are no waiting queues for this service")
    
    next_queue.status = "serving"
    db.commit()
    db.refresh(next_queue)
    return next_queue