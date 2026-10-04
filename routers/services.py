from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
import security  # 1. 🟢 เพิ่ม import security

router = APIRouter(
    prefix="/services",
    tags=["Services"]
)

# --- ดูรายการบริการ (Public: ไม่ต้องล็อกอิน) ---
@router.get("/", response_model=List[schemas.ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()

# --- สร้างบริการใหม่ (Protected: ต้องล็อกอิน 🔒) ---
@router.post("/", response_model=schemas.ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    service: schemas.ServiceCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)  # 2. 🔒 เพิ่มเช็ค Auth
):
    new_service = models.Service(
        name=service.name,
        description=service.description
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return new_service

# --- แก้ไขข้อมูลแผนกบริการ (Protected: ต้องล็อกอิน 🔒) ---
@router.put("/{service_id}", response_model=schemas.ServiceResponse)
def update_service(
    service_id: int, 
    service_data: schemas.ServiceUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)  # 2. 🔒 เพิ่มเช็ค Auth
):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service_data.name is not None:
        service.name = service_data.name
    if service_data.description is not None:
        service.description = service_data.description
        
    db.commit()
    db.refresh(service)
    return service

# --- ลบแผนกบริการ (Protected: ต้องล็อกอิน 🔒) ---
@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)  # 2. 🔒 เพิ่มเช็ค Auth
):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db.delete(service)
    db.commit()
    return None