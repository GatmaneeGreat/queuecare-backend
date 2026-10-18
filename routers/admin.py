
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
import security
import schemas


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


# ========================================================
# HELPERS
# ========================================================

def get_months_used(started_at, now):
    """Count completed calendar months since subscription started."""
    if started_at is None:
        return 0

    # Handle timestamps returned without timezone information.
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)

    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    months = (
        (now.year - started_at.year) * 12
        + now.month - started_at.month
    )

    if now.day < started_at.day:
        months -= 1
    elif (
        now.day == started_at.day
        and (
            now.hour,
            now.minute,
            now.second,
        ) < (
            started_at.hour,
            started_at.minute,
            started_at.second,
        )
    ):
        months -= 1

    return max(months, 0)


# ========================================================
# ADMIN DASHBOARD
# GET /admin/dashboard/stats
# ========================================================

@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user=Depends(security.require_roles(["admin"])),
):
    total_hospitals = db.query(models.Hospital).count()

    free_hospitals = (
        db.query(models.Hospital)
        .filter(models.Hospital.package == "free")
        .count()
    )

    pro_hospitals = (
        db.query(models.Hospital)
        .filter(models.Hospital.package == "pro")
        .count()
    )

    total_nurses = (
        db.query(models.User)
        .filter(models.User.role == "nurse")
        .count()
    )

    return {
        "total_hospitals": total_hospitals,
        "free_hospitals": free_hospitals,
        "pro_hospitals": pro_hospitals,
        "total_nurses": total_nurses,
    }


# ========================================================
# READ-ONLY HOSPITAL LIST
# GET /admin/hospitals
# ========================================================

@router.get("/hospitals")
def get_hospitals(
    db: Session = Depends(database.get_db),
    current_user=Depends(security.require_roles(["admin"])),
):
    hospitals = (
        db.query(models.Hospital)
        .order_by(models.Hospital.id.asc())
        .all()
    )

    now = datetime.now(timezone.utc)
    result = []

    for hospital in hospitals:
        result.append({
            "id": hospital.id,
            "name": hospital.name,
            "package": hospital.package,
            "subscription_status": hospital.subscription_status,
            "created_at": hospital.created_at,
            "subscription_started_at":
                hospital.subscription_started_at,
            "subscription_expires_at":
                hospital.subscription_expires_at,
            "months_used": get_months_used(
                hospital.subscription_started_at,
                now,
            ),
        })

    return result


# ========================================================
# READ-ONLY HOSPITAL DETAIL
# GET /admin/hospitals/{hospital_id}
# ========================================================

@router.get("/hospitals/{hospital_id}")
def get_hospital_detail(
    hospital_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(security.require_roles(["admin"])),
):
    hospital = (
        db.query(models.Hospital)
        .filter(models.Hospital.id == hospital_id)
        .first()
    )

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found.",
        )

    now = datetime.now(timezone.utc)

    return {
        "id": hospital.id,
        "name": hospital.name,
        "package": hospital.package,
        "subscription_status": hospital.subscription_status,
        "created_at": hospital.created_at,
        "subscription_started_at":
            hospital.subscription_started_at,
        "subscription_expires_at":
            hospital.subscription_expires_at,
        "months_used": get_months_used(
            hospital.subscription_started_at,
            now,
        ),
        "total_nurses": (
            db.query(models.User)
            .filter(
                models.User.hospital_id == hospital.id,
                models.User.role == "nurse",
            )
            .count()
        ),
        "total_services": (
            db.query(models.Service)
            .filter(
                models.Service.hospital_id == hospital.id,
            )
            .count()
        ),
    }


# ========================================================
# READ-ONLY SUBSCRIPTION PAYMENT HISTORY
# GET /admin/subscription-payments
# ========================================================

@router.get("/subscription-payments")
def get_subscription_payments(
    db: Session = Depends(database.get_db),
    current_user=Depends(security.require_roles(["admin"])),
):
    payments = (
        db.query(models.SubscriptionPayment)
        .order_by(
            models.SubscriptionPayment.created_at.desc(),
            models.SubscriptionPayment.id.desc(),
        )
        .all()
    )

    result = []

    for payment in payments:
        hospital = (
            db.query(models.Hospital)
            .filter(
                models.Hospital.id == payment.hospital_id,
            )
            .first()
        )

        result.append({
            "id": payment.id,
            "hospital_id": payment.hospital_id,
            "hospital_name": (
                hospital.name if hospital else None
            ),
            "amount": payment.amount,
            "package": payment.package,
            "payment_method": payment.payment_method,
            "reference": payment.reference,
            "status": payment.status,
            "is_demo": payment.is_demo,
            "created_at": payment.created_at,
            "paid_at": payment.paid_at,
        })

    return result


# ========================================================
# READ-ONLY PAYMENT HISTORY FOR ONE HOSPITAL
# GET /admin/hospitals/{hospital_id}/subscription-payments
# ========================================================

@router.get("/hospitals/{hospital_id}/subscription-payments")
def get_hospital_subscription_payments(
    hospital_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(security.require_roles(["admin"])),
):
    hospital = (
        db.query(models.Hospital)
        .filter(models.Hospital.id == hospital_id)
        .first()
    )

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found.",
        )

    payments = (
        db.query(models.SubscriptionPayment)
        .filter(
            models.SubscriptionPayment.hospital_id == hospital_id,
        )
        .order_by(
            models.SubscriptionPayment.created_at.desc(),
            models.SubscriptionPayment.id.desc(),
        )
        .all()
    )

    return [
        {
            "id": payment.id,
            "hospital_id": payment.hospital_id,
            "hospital_name": hospital.name,
            "amount": payment.amount,
            "package": payment.package,
            "payment_method": payment.payment_method,
            "reference": payment.reference,
            "status": payment.status,
            "is_demo": payment.is_demo,
            "created_at": payment.created_at,
            "paid_at": payment.paid_at,
        }
        for payment in payments
    ]


# ========================================================
# CREATE HOSPITAL ADMIN
# POST /admin/hospital-admins
# ========================================================

@router.post("/hospital-admins", status_code=201)
def create_hospital_admin(
    admin_data: schemas.HospitalAdminCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(security.require_roles(["admin"])),
):
    name = admin_data.name.strip()
    email = str(admin_data.email).strip().lower()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required.",
        )

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="This email address is already registered.",
        )

    hospital = (
        db.query(models.Hospital)
        .filter(
            models.Hospital.id == admin_data.hospital_id,
        )
        .first()
    )

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found.",
        )

    new_admin = models.User(
        name=name,
        email=email,
        hashed_password=security.hash_password(
            admin_data.password,
        ),
        role="hospital_admin",
        position="Hospital Admin",
        hospital_id=hospital.id,
        approval_status="approved",
    )

    try:
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create Hospital Admin account.",
        )

    return {
        "message": "Hospital Admin created successfully.",
        "id": new_admin.id,
        "name": new_admin.name,
        "email": new_admin.email,
        "role": new_admin.role,
        "hospital_id": new_admin.hospital_id,
        "hospital_name": hospital.name,
    }
