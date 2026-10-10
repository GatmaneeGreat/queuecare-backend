
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

@router.get(
    "/search",
    response_model=schemas.QueueResponse
)
def search_queue_by_name(
    name: str,
    db: Session = Depends(get_db)
):
    # จัดการช่องว่างหัวท้ายและช่องว่างซ้ำ
    search_name = " ".join(name.split())

    if not search_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="กรุณาระบุชื่อผู้ป่วย"
        )

    # 1. ค้นหาชื่อเต็มก่อน โดยไม่สนตัวพิมพ์เล็ก/ใหญ่
    exact_users = (
        db.query(models.User)
        .filter(models.User.name.ilike(search_name))
        .all()
    )

    if len(exact_users) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "พบผู้ป่วยชื่อเดียวกันหลายบัญชี "
                "กรุณาติดต่อเจ้าหน้าที่เพื่อยืนยันตัวตน"
            )
        )

    if len(exact_users) == 1:
        user = exact_users[0]

    else:
        # 2. ถ้าไม่พบชื่อเต็ม ค้นหาชื่อบางส่วน
        users = (
            db.query(models.User)
            .filter(
                models.User.name.ilike(f"%{search_name}%")
            )
            .all()
        )

        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ไม่พบผู้ป่วยชื่อ '{search_name}'"
            )

        # ห้ามเลือกคนแรกเอง หากมีหลายคนชื่อคล้ายกัน
        if len(users) > 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "พบผู้ป่วยหลายคนที่ชื่อคล้ายกัน "
                    "กรุณากรอกชื่อและนามสกุลให้ครบถ้วน"
                )
            )

        user = users[0]

    # 3. ค้นหาคิวที่ยังรอหรือกำลังให้บริการ
    # โดยต้องเป็นคิวของผู้ป่วยที่ค้นพบเท่านั้น
    queue = (
        db.query(models.Queue)
        .filter(
            models.Queue.user_id == user.id,
            models.Queue.status.in_(["waiting", "serving"])
        )
        .order_by(models.Queue.created_at.desc())
        .first()
    )

    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"พบผู้ป่วยชื่อ '{user.name}' "
                "แต่ไม่พบคิวที่กำลังดำเนินการ"
            )
        )

    # 4. ส่งคิวที่ตรงกับผู้ป่วยกลับไป
    return queue


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
    allowed_statuses = [
        "waiting",
        "serving",
        "completed",
        "cancelled"
    ]

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="สถานะคิวไม่ถูกต้อง"
        )

    queue = (
        db.query(models.Queue)
        .filter(models.Queue.id == queue_id)
        .first()
    )

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
    # ค้นหาคิวด้วย Token ที่ส่งมาจาก URL
    queue = (
        db.query(models.Queue)
        .filter(models.Queue.share_token == token)
        .first()
    )

    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบคิวจากลิงก์นี้"
        )

    # นับจำนวนคิวที่รอก่อนหน้าในบริการเดียวกัน
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

    # ค้นหาคิวที่กำลังให้บริการในบริการเดียวกัน
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

    # ส่งข้อมูลคิวและข้อมูลที่หน้า Track ต้องใช้
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
        current_serving_number=(
            current_serving.number if current_serving else None
        )
    )
