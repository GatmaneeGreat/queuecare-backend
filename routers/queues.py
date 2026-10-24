import queue
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text, or_
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas
import security


router = APIRouter(
    prefix="/queues",
    tags=["Queues"],
)


# ==================================================
# HELPERS
# ==================================================

def get_queue_number_value(number: str) -> int:
    """Support queue numbers such as A001 and Q001."""
    match = re.match(r"^[AQ](\d+)$", str(number or ""), re.IGNORECASE)
    return int(match.group(1)) if match else 0


def ensure_service_access(service, current_user):
    """Check whether a user may manage a service."""
    if current_user.role == "admin":
        return

    if current_user.role not in {"hospital_admin", "nurse"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage queues.",
        )

    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not assigned to a hospital.",
        )

    if service.hospital_id != current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot access another hospital's service.",
            
        )

    if (
        current_user.role == "nurse"
        and current_user.service_id is not None
        and current_user.service_id != service.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot access this service.",
        )


def get_authorized_queue(db: Session, queue_id: int, current_user):
    """Load a queue and verify access to its service."""
    queue = (
        db.query(models.Queue)
        .options(
            joinedload(models.Queue.user),
            joinedload(models.Queue.service),
        )
        .filter(models.Queue.id == queue_id)
        .first()
    )

    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found.",
        )

    if queue.service is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Queue has no valid service department.",
        )

    ensure_service_access(queue.service, current_user)
    return queue


def get_patient_for_queue(db: Session, user_id: int, service):
    """Validate that the selected account is a patient."""
    patient = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient account not found.",
        )

    if patient.role not in {"patient", "customer"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Queue must be assigned to a patient account.",
        )

    # If the patient account is assigned to a hospital,
    # prevent attaching it to a different hospital's queue.
    # Legacy patient accounts with hospital_id=None remain supported.
    if (
        patient.hospital_id is not None
        and service.hospital_id is not None
        and patient.hospital_id != service.hospital_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This patient account belongs to another hospital.",
        )

    return patient


# ==================================================
# CREATE QUEUE
# ==================================================

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
    if current_user.role not in {"admin", "hospital_admin", "nurse"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized hospital staff can create queues.",
        )

    if queue.service_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a service department.",
        )

    patient_name = (queue.patient_name or "").strip()

    if not patient_name and queue.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a patient name or patient account ID.",
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

    ensure_service_access(service, current_user)

    try:
        # PostgreSQL transaction-level lock to reduce duplicate queue numbers.
        db.execute(
            text("SELECT pg_advisory_xact_lock(:lock_id)"),
            {"lock_id": int(queue.service_id)},
        )

        existing_numbers = (
            db.query(models.Queue.number)
            .filter(models.Queue.service_id == queue.service_id)
            .with_for_update()
            .all()
        )

        highest_number = max(
            (get_queue_number_value(row[0]) for row in existing_numbers),
            default=0,
        )

        new_number = f"A{highest_number + 1:03d}"
        assigned_user_id = queue.user_id

        if patient_name:
            # Only reuse an exact-name patient from this hospital
            # or a legacy account without a hospital assignment.
            patient = (
                db.query(models.User)
                .filter(models.User.name == patient_name)
                .filter(models.User.role.in_(["patient", "customer"]))
                .filter(
                    or_(
                        models.User.hospital_id == service.hospital_id,
                        models.User.hospital_id.is_(None),
                    )
                )
                .order_by(models.User.id.asc())
                .first()
            )

            if patient is None:
                patient = models.User(
                    name=patient_name,
                    email=f"patient_{uuid.uuid4().hex}@example.com",
                    hashed_password=security.hash_password(
                        str(uuid.uuid4())
                    ),
                    role="patient",
                    hospital_id=service.hospital_id,
                )
                db.add(patient)
                db.flush()

            assigned_user_id = patient.id

        if assigned_user_id is not None:
            get_patient_for_queue(
                db,
                assigned_user_id,
                service,
            )

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

        result = (
            db.query(models.Queue)
            .options(
                joinedload(models.Queue.user),
                joinedload(models.Queue.service),
            )
            .filter(models.Queue.id == new_queue.id)
            .first()
        )

        return result

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        import traceback

        db.rollback()
        print("\n========== CREATE QUEUE ERROR ==========")
        traceback.print_exc()
        print("Error type:", type(exc).__name__)
        print("Error message:", str(exc))
        print("========================================\n")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create queue. Please try again.",
        ) from exc


# ==================================================
# GET QUEUES
# ==================================================

@router.get("/", response_model=list[schemas.QueueResponse])
def get_queues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    query = (
        db.query(models.Queue)
        .join(
            models.Service,
            models.Queue.service_id == models.Service.id,
        )
        .options(
            joinedload(models.Queue.user),
            joinedload(models.Queue.service),
        )
    )

    if current_user.role == "admin":
        # System admin can view all hospitals.
        pass

    elif current_user.role in {"hospital_admin", "nurse"}:
        if not current_user.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is not assigned to a hospital.",
            )

        query = query.filter(
            models.Service.hospital_id == current_user.hospital_id
        )

        if (
            current_user.role == "nurse"
            and current_user.service_id is not None
        ):
            query = query.filter(
                models.Queue.service_id == current_user.service_id
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view queues.",
        )

    return query.order_by(models.Queue.created_at.desc()).all()


# ==================================================
# PUBLIC SEARCH BY PATIENT NAME
# ==================================================

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

    # Exact-name matching reduces accidental disclosure of another
    # patient's queue when names are similar.
    matches = (
        db.query(models.Queue)
        .join(models.User, models.Queue.user_id == models.User.id)
        .filter(models.User.role.in_(["patient", "customer"]))
        .filter(models.User.name.ilike(clean_name))
        .filter(models.Queue.status.in_(["waiting", "serving"]))
        .order_by(models.Queue.created_at.desc())
        .limit(2)
        .all()
    )

    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active queue found for this patient.",
        )

    if len(matches) > 1:
        # Do not reveal how many queues or which hospitals matched.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Multiple active queues match this name. "
                "Please use the queue QR code or share link."
            ),
        )

    found_queue = matches[0]

    if not found_queue.share_token:
        found_queue.share_token = uuid.uuid4().hex + uuid.uuid4().hex
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


# ==================================================
# UPDATE QUEUE STATUS
# ==================================================

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

    queue = get_authorized_queue(db, queue_id, current_user)

    try:
        queue.status = new_status
        db.commit()
        db.refresh(queue)

        return (
            db.query(models.Queue)
            .options(
                joinedload(models.Queue.user),
                joinedload(models.Queue.service),
            )
            .filter(models.Queue.id == queue.id)
            .first()
        )
    except Exception:
        db.rollback()
        raise


# ==================================================
# CALL NEXT QUEUE
# ==================================================

@router.post("/next", response_model=schemas.QueueResponse)
def call_next_queue(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role not in {"admin", "hospital_admin", "nurse"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized hospital staff can call the next queue.",
        )

    service = (
        db.query(models.Service)
        .filter(models.Service.id == service_id)
        .first()
    )

    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service department not found.",
        )

    ensure_service_access(service, current_user)

    try:
        # Lock the selected service row to reduce the chance that
        # two staff members call the same waiting queue simultaneously.
        locked_service = (
            db.query(models.Service)
            .filter(models.Service.id == service_id)
            .with_for_update()
            .first()
        )

        if locked_service is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service department not found.",
            )

        next_queue = (
            db.query(models.Queue)
            .filter(models.Queue.service_id == service_id)
            .filter(models.Queue.status == "waiting")
            .order_by(
                models.Queue.created_at.asc(),
                models.Queue.id.asc(),
            )
            .with_for_update()
            .first()
        )

        if next_queue is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="There are no waiting queues for this service.",
            )

        next_queue.status = "serving"
        db.commit()

        return (
            db.query(models.Queue)
            .options(
                joinedload(models.Queue.user),
                joinedload(models.Queue.service),
            )
            .filter(models.Queue.id == next_queue.id)
            .first()
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


# ==================================================
# PUBLIC QUEUE TRACKING BY SHARE TOKEN
# ==================================================

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
        .options(joinedload(models.Queue.service))
        .filter(models.Queue.share_token == token)
        .first()
    )

    if queue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue not found.",
        )

    ahead_count = 0

    if queue.status == "waiting":
        ahead_count = (
            db.query(models.Queue)
            .filter(models.Queue.service_id == queue.service_id)
            .filter(models.Queue.status == "waiting")
            .filter(
                (models.Queue.created_at < queue.created_at)
                | (
                    (models.Queue.created_at == queue.created_at)
                    & (models.Queue.id < queue.id)
                )
            )
            .count()
        )

    serving_queue = (
        db.query(models.Queue)
        .filter(models.Queue.service_id == queue.service_id)
        .filter(models.Queue.status == "serving")
        .order_by(
            models.Queue.created_at.asc(),
            models.Queue.id.asc(),
        )
        .first()
    )
    return {
        "id": queue.id,
        "number": queue.number,
        "status": queue.status,
        "service_id": queue.service_id,
        "created_at": queue.created_at,
        "patient_name": queue.user.name if queue.user else None,
        # Never expose the patient's email or password-related fields
        # through this public endpoint.
        "user": None,
        "service": queue.service,
        "ahead_count": ahead_count,
        "current_serving_number": (
            serving_queue.number if serving_queue else None
        ),
    }