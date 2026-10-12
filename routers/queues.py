import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import security


router = APIRouter(
    prefix="/queues",
    tags=["Queues"]
)


# =========================================================
# CREATE QUEUE
# POST /queues/
# =========================================================

@router.post(
    "/",
    response_model=schemas.QueueResponse,
    status_code=status.HTTP_201_CREATED
)
def create_queue(
    queue: schemas.QueueCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    # 1. เช็กว่าพยาบาลส่งชื่อคนไข้มาด้วยไหม
    patient_name = getattr(queue, "patient_name", None)

    assigned_user_id = current_user.id

    # 2. ถ้ามีชื่อคนไข้ ให้สร้าง User จำลองให้ผู้ป่วย เพื่อให้ค้นหาชื่อเจอ
    if patient_name:
        clean_name = patient_name.strip()
        existing_user = db.query(models.User).filter(models.User.name == clean_name).first()

        if not existing_user:
            # สร้างอีเมลและรหัสผ่านจำลอง เพื่อป้องกัน Database Error 500
            dummy_email = f"patient_{uuid.uuid4().hex[:8]}@example.com"
            new_user = models.User(
                name=clean_name,
                email=dummy_email,
                hashed_password="dummy_password",
                role="patient"
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            assigned_user_id = new_user.id
        else:
            assigned_user_id = existing_user.id

    # 3. สร้างคิวและผูกกับ ID คนไข้
    new_queue = models.Queue(
        number=queue.number,
        user_id=assigned_user_id,
        service_id=queue.service_id,
        share_token=str(uuid.uuid4())
    )

    # กรณีฐานข้อมูล Queue มีคอลัมน์ patient_name โดยตรงให้บันทึกด้วย
    if hasattr(new_queue, "patient_name") and patient_name:
        new_queue.patient_name = clean_name

    db.add(new_queue)
    db.commit()
    db.refresh(new_queue)

    return new_queue


# =========================================================
# GET ALL QUEUES
# GET /queues/
# =========================================================

@router.get(
    "/",
    response_model=List[schemas.QueueResponse]
)
def get_queues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return db.query(models.Queue).all()


# =========================================================
# SEARCH QUEUE BY PATIENT NAME
# GET /queues/search?name=John%20Doe
# =========================================================

@router.get("/search")
def search_queue_by_name(
    name: str,
    db: Session = Depends(get_db)
):
    search_name = " ".join(name.split())
    if not search_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="กรุณาระบุชื่อผู้ป่วย"
        )

    # 1. ค้นหาชื่อคนไข้จากตาราง User (รองรับการพิมพ์แค่บางส่วน)
    users = db.query(models.User).filter(models.User.name.ilike(f"%{search_name}%")).all()
    queue = None

    if users:
        user_ids = [u.id for u in users]
        queue = (
            db.query(models.Queue)
            .filter(
                models.Queue.user_id.in_(user_ids),
                models.Queue.status.in_(["waiting", "serving"])
            )
            .order_by(models.Queue.id.desc())
            .first()
        )

    # 2. ค้นหาสำรองจากคอลัมน์ patient_name ในตาราง Queue โดยตรง
    if not queue and hasattr(models.Queue, "patient_name"):
        queue = (
            db.query(models.Queue)
            .filter(
                models.Queue.patient_name.ilike(f"%{search_name}%"),
                models.Queue.status.in_(["waiting", "serving"])
            )
            .order_by(models.Queue.id.desc())
            .first()
        )

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบผู้ป่วยชื่อ '{search_name}'"
        )

    # [แก้ 1] ถ้าคิวเก่ายังไม่มี token ให้สร้างและบันทึกให้เลย
    if not queue.share_token:
        queue.share_token = str(uuid.uuid4())
        db.commit()
        db.refresh(queue)

    # ดึงชื่อเพื่อส่งกลับหน้าเว็บ
    patient_name_result = getattr(queue, "patient_name", None)
    if not patient_name_result and queue.user:
        patient_name_result = queue.user.name

    # 3. จัด Format คืนค่าให้ตรงกับตัวแปรที่หน้า index.html ต้องการ
    return {
        "status": "success",
        "token": queue.share_token,   # [แก้ 1] เดิม: queue.share_token or queue.number
        "queue_number": queue.number,
        "patient_name": patient_name_result or search_name
    }


# =========================================================
# UPDATE QUEUE STATUS
# PATCH /queues/{queue_id}/status
# =========================================================

@router.patch(
    "/{queue_id}/status",
    response_model=schemas.QueueResponse
)
def update_queue_status(
    queue_id: int,
    status_data: schemas.QueueStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    allowed_statuses = ["waiting", "serving", "completed", "cancelled"]

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="สถานะคิวไม่ถูกต้อง"
        )

    queue = db.query(models.Queue).filter(models.Queue.id == queue_id).first()

    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบคิวที่ต้องการ"
        )

    queue.status = status_data.status
    db.commit()
    db.refresh(queue)

    return queue


# =========================================================
# CALL NEXT QUEUE
# POST /queues/next?service_id=1
# =========================================================

@router.post(
    "/next",
    response_model=schemas.QueueResponse
)
def call_next_queue(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    next_queue = (
        db.query(models.Queue)
        .filter(
            models.Queue.service_id == service_id,
            models.Queue.status == "waiting"
        )
        .order_by(models.Queue.id.asc())
        .first()
    )

    if next_queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่มีคิวที่กำลังรอสำหรับบริการนี้"
        )

    next_queue.status = "serving"
    db.commit()
    db.refresh(next_queue)

    return next_queue


# =========================================================
# PUBLIC QUEUE
# GET /queues/public/{token}
# =========================================================

@router.get(
    "/public/{token}",
    response_model=schemas.PublicQueueResponse
)
def get_public_queue(
    token: str,
    db: Session = Depends(get_db)
):
    queue = db.query(models.Queue).filter(models.Queue.share_token == token).first()

    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบคิวจากลิงก์นี้"
        )

    ahead_count = 0
    if queue.service_id is not None:
        ahead_count = (
            db.query(models.Queue)
            .filter(
                models.Queue.service_id == queue.service_id,
                models.Queue.status == "waiting",
                models.Queue.id < queue.id
            )
            .count()
        )

    current_serving = None
    if queue.service_id is not None:
        current_serving = (
            db.query(models.Queue)
            .filter(
                models.Queue.service_id == queue.service_id,
                models.Queue.status == "serving"
            )
            .order_by(models.Queue.id.desc())
            .first()
        )

    # [แก้ 2] ตัด user_id และ share_token ออก ให้ตรงกับ PublicQueueResponse ที่แก้แล้ว
    return schemas.PublicQueueResponse(
        id=queue.id,
        number=queue.number,
        status=queue.status,
        service_id=queue.service_id,
        created_at=queue.created_at,
        user=queue.user,
        service=queue.service,
        ahead_count=ahead_count,
        current_serving_number=(
            current_serving.number if current_serving else None
        )
    )