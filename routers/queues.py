
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas
import security


router = APIRouter(
    prefix="/queues",
    tags=["Queues"],
)


def get_queue_number_value(number: str) -> int:
    """Read old Q numbers and current A numbers."""
    match = re.match(r"^[QA](\d+)$", str(number or ""), re.IGNORECASE)
    return int(match.group(1)) if match else 0


# --------------------------------------------------
# Create a queue
# Backend generates the queue number.
# --------------------------------------------------
@router.post(
    "/",
    response_model=schemas.QueueResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_queue(
    queue: schemas.QueueCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if queue.service_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a service department.",
        )

    try:
        # Lock number generation for this service.
        # This requires PostgreSQL.
        db.execute(
            text("SELECT pg_advisory_xact_lock(:lock_id)"),
            {"lock_id": int(queue.service_id)},
        )

        service = (
            db.query(models.Service)
            .filter(models.Service.id == queue.service_id)
            .first()
        )

        if service is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service department not found.",
            )

        existing_queues = (
            db.query(models.Queue)
            .filter(models.Queue.service_id == queue.service_id)
            .all()
        )

        highest_number = max(
            (
                get_queue_number_value(item.number)
                for item in existing_queues
            ),
            default=0,
        )

        new_number = f"A{highest_number + 1:03d}"

        # Preserve the existing patient-name behavior.
        patient_name = getattr(queue, "patient_name", None)
        assigned_user_id = current_user.id

        if patient_name and patient_name.strip():
            clean_name = patient_name.strip()

            patient = (
                db.query(models.User)
                .filter(models.User.name == clean_name)
                .filter(models.User.role == "patient")
                .first()
            )

            if patient is None:
                patient = models.User(
                    name=clean_name,
                    email=f"patient_{uuid.uuid4().hex[:12]}@example.com",
                    hashed_password="dummy_password",
                    role="patient",
                )
                db.add(patient)
                db.flush()

            assigned_user_id = patient.id

        new_queue = models.Queue(
            number=new_number,
            status="waiting",
            user_id=assigned_user_id,
            service_id=queue.service_id,
            share_token=str(uuid.uuid4()),
        )

        db.add(new_queue)
        db.commit()
        db.refresh(new_queue)

        return new_queue

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create queue. Please try again.",
        ) from exc


# --------------------------------------------------
# Get queues
# --------------------------------------------------
@router.get("/", response_model=list[schemas.QueueResponse])
def get_queues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    return (
        db.query(models.Queue)
        .options(
            joinedload(models.Queue.user),
            joinedload(models.Queue.service),
        )
        .order_by(models.Queue.created_at.desc())
        .all()
    )


# --------------------------------------------------
# Search a patient's latest active queue
# Public endpoint
# --------------------------------------------------
@router.get("/search")
def search_queue(
    name: str,
    db: Session = Depends(get_db),
):
    clean_name = name.strip()

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a patient name.",
        )

    patient_users = (
        db.query(models.User)
        .filter(models.User.name.ilike(f"%{clean_name}%"))
        .all()
    )

    patient_ids = [patient.id for patient in patient_users]

    found_queue = None

    if patient_ids:
        found_queue = (
            db.query(models.Queue)
            .filter(models.Queue.user_id.in_(patient_ids))
            .filter(models.Queue.status.in_(["waiting", "serving"]))
            .order_by(models.Queue.created_at.desc())
            .first()
        )

    if found_queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active queue found for this patient.",
        )

    if not found_queue.share_token:
        found_queue.share_token = str(uuid.uuid4())
        db.commit()
        db.refresh(found_queue)

    patient = (
        db.query(models.User)
        .filter(models.User.id == found_queue.user_id)
        .first()
    )

    return {
        "status": "success",
        "token": found_queue.share_token,
        "queue_number": found_queue.number,
        "patient_name": patient.name if patient else "Patient",
    }


# --------------------------------------------------
# Update queue status
# --------------------------------------------------
@router.patch("/{queue_id}/status", response_model=schemas.QueueResponse)
def update_queue_status(
    queue_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    allowed_statuses = {
        "waiting",
        "serving",
        "completed",
        "cancelled",
    }

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid queue status.",
        )

    queue = (
        db.query(models.Queue)
        .filter(models.Queue.id == queue_id)
        .first()
    )

    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found.",
        )

    queue.status = new_status
    db.commit()
    db.refresh(queue)

    return queue


# --------------------------------------------------
# Call the next waiting queue in a service
# --------------------------------------------------
@router.post("/next", response_model=schemas.QueueResponse)
def call_next_queue(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    next_queue = (
        db.query(models.Queue)
        .filter(models.Queue.service_id == service_id)
        .filter(models.Queue.status == "waiting")
        .order_by(models.Queue.created_at.asc(), models.Queue.id.asc())
        .first()
    )

    if next_queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="There are no waiting queues for this service.",
        )

    next_queue.status = "serving"
    db.commit()
    db.refresh(next_queue)

    return next_queue


# --------------------------------------------------
# Public queue tracking by token
# --------------------------------------------------
@router.get(
    "/public/{token}",
    response_model=schemas.PublicQueueResponse,
)
def get_public_queue(
    token: str,
    db: Session = Depends(get_db),
):
    queue = (
        db.query(models.Queue)
        .filter(models.Queue.share_token == token)
        .first()
    )

    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found.",
        )

    ahead_count = (
        db.query(models.Queue)
        .filter(models.Queue.service_id == queue.service_id)
        .filter(models.Queue.status == "waiting")
        .filter(models.Queue.created_at < queue.created_at)
        .count()
    )

    serving_queue = (
        db.query(models.Queue)
        .filter(models.Queue.service_id == queue.service_id)
        .filter(models.Queue.status == "serving")
        .order_by(models.Queue.created_at.asc())
        .first()
    )

    return {
        "id": queue.id,
        "number": queue.number,
        "status": queue.status,
        "service_id": queue.service_id,
        "created_at": queue.created_at,
        "user": queue.user,
        "service": queue.service,
        "ahead_count": ahead_count,
        "current_serving_number": (
            serving_queue.number if serving_queue else None
        ),
    }
