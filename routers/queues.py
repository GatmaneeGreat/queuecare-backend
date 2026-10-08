import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

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
    new_queue = models.Queue(
        number=queue.number,
        user_id=current_user.id,
        service_id=queue.service_id,
        share_token=str(uuid.uuid4())
    )

    db.add(new_queue)
    db.commit()
    db.refresh(new_queue)

    return new_queue


# =========================================================
# GET ALL QUEUES
# =========================================================

@router.get(
    "/",
    response_model=List[schemas.QueueResponse]
)
def get_queues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return (
        db.query(models.Queue)
        .all()
    )


# =========================================================
# SEARCH QUEUE BY PATIENT NAME
# =========================================================
#
# ตัวอย่าง:
#
# GET /queues/search?name=สมชาย%20ใจดี
#
# =========================================================

@router.get(
    "/search",
    response_model=schemas.QueueResponse
)
def search_queue_by_name(
    name: str,
    db: Session = Depends(get_db)
):
    search_name = name.strip()

    if not search_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="กรุณาระบุชื่อผู้ป่วย"
        )

    # ค้นหาผู้ป่วยจากชื่อ
    user = (
        db.query(models.User)
        .filter(
            models.User.name.ilike(search_name)
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบผู้ป่วยชื่อ '{search_name}'"
        )

    # หา queue ล่าสุดของผู้ป่วย
    queue = (
        db.query(models.Queue)
        .filter(
            models.Queue.user_id == user.id,
            models.Queue.status.in_(
                ["waiting", "serving"]
            )
        )
        .order_by(
            models.Queue.created_at.desc()
        )
        .first()
    )

    # ถ้าไม่มีคิว waiting/serving
    # ให้ลองหา queue ล่าสุดทุกสถานะ
    if not queue:
        queue = (
            db.query(models.Queue)
            .filter(
                models.Queue.user_id == user.id
            )
            .order_by(
                models.Queue.created_at.desc()
            )
            .first()
        )

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"พบผู้ป่วย '{user.name}' แต่ยังไม่มีคิว"
        )

    return queue


# =========================================================
# UPDATE QUEUE STATUS
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
    queue = (
        db.query(models.Queue)
        .filter(models.Queue.id == queue_id)
        .first()
    )

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found"
        )

    queue.status = status_data.status

    db.commit()
    db.refresh(queue)

    return queue


# =========================================================
# CALL NEXT QUEUE
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
        .order_by(
            models.Queue.id.asc()
        )
        .first()
    )

    if not next_queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="There are no waiting queues for this service"
        )

    next_queue.status = "serving"

    db.commit()
    db.refresh(next_queue)

    return next_queue


# =========================================================
# PUBLIC QUEUE
# =========================================================
#
# ใช้สำหรับหน้า /track/{token}
#
# ไม่ต้อง Login
#
# =========================================================

@router.get(
    "/public/{token}",
    response_model=schemas.PublicQueueResponse
)
def get_public_queue(
    token: str,
    db: Session = Depends(get_db)
):
    # หา queue จาก share token
    queue = (
        db.query(models.Queue)
        .filter(
            models.Queue.share_token == token
        )
        .first()
    )

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found"
        )

    # -----------------------------------------
    # นับจำนวนคิวก่อนหน้า
    # -----------------------------------------

    ahead_count = 0

    if queue.service_id is not None:
        waiting_queues = (
            db.query(models.Queue)
            .filter(
                models.Queue.service_id == queue.service_id,
                models.Queue.status == "waiting",
                models.Queue.id < queue.id
            )
            .all()
        )

        ahead_count = len(waiting_queues)

    # -----------------------------------------
    # หา queue ที่กำลังให้บริการ
    # -----------------------------------------

    current_serving = None

    if queue.service_id is not None:
        current_serving = (
            db.query(models.Queue)
            .filter(
                models.Queue.service_id == queue.service_id,
                models.Queue.status == "serving"
            )
            .order_by(
                models.Queue.id.desc()
            )
            .first()
        )

    current_serving_number = None

    if current_serving:
        current_serving_number = current_serving.number

    # -----------------------------------------
    # ส่งข้อมูลกลับ
    # -----------------------------------------

    return schemas.PublicQueueResponse(
        id=queue.id,
        number=queue.number,
        status=queue.status,
        user_id=queue.user_id,
        service_id=queue.service_id,
        created_at=queue.created_at,
        share_token=queue.share_token,
        user=queue.user,
        service=queue.service,
        ahead_count=ahead_count,
        current_serving_number=current_serving_number
    )