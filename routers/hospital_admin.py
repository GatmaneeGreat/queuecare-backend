
import calendar
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

import database
import models
import schemas
import security


router = APIRouter(
    prefix="/hospital-admin",
    tags=["Hospital Admin"],
)


# ========================================================
# CONSTANTS AND HELPERS
# ========================================================

PRO_PRICE = 799
AVAILABLE_PACKAGES = {"free", "pro"}


def utc_now():
    return datetime.now(timezone.utc)


def add_one_calendar_month(value):
    """Add one calendar month, handling month-end dates safely."""
    month_index = value.month - 1 + 1
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])

    return value.replace(year=year, month=month, day=day)


def as_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def payment_to_dict(payment):
    return {
        "id": payment.id,
        "hospital_id": payment.hospital_id,
        "amount": payment.amount,
        "package": payment.package,
        "payment_method": payment.payment_method,
        "reference": payment.reference,
        "status": payment.status,
        "is_demo": payment.is_demo,
        "created_at": payment.created_at,
        "paid_at": payment.paid_at,
    }


def get_hospital_admin(
    current_user: models.User = Depends(
        security.require_roles(["hospital_admin"])
    ),
):
    """Only hospital administrators assigned to a hospital can proceed."""
    if current_user.hospital_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not assigned to a hospital.",
        )

    return current_user


def get_current_hospital(db, current_user):
    """Return the hospital belonging to the authenticated administrator."""
    hospital = (
        db.query(models.Hospital)
        .filter(models.Hospital.id == current_user.hospital_id)
        .first()
    )

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found.",
        )

    return hospital


# ========================================================
# 1. HOSPITAL ADMIN DASHBOARD
# GET /hospital-admin/dashboard
# ========================================================

@router.get("/dashboard")
def get_hospital_dashboard(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    hospital = get_current_hospital(db, current_user)

    nurses_query = db.query(models.User).filter(
        models.User.role == "nurse",
        models.User.hospital_id == hospital.id,
    )

    return {
        "hospital_id": hospital.id,
        "hospital_name": hospital.name,
        "package": hospital.package,
        "subscription_status": hospital.subscription_status,
        "subscription_started_at": hospital.subscription_started_at,
        "subscription_expires_at": hospital.subscription_expires_at,
        "total_nurses": nurses_query.count(),
        "approved_nurses": nurses_query.filter(
            models.User.approval_status == "approved"
        ).count(),
        "pending_nurses": nurses_query.filter(
            models.User.approval_status == "pending"
        ).count(),
        "total_services": db.query(models.Service).filter(
            models.Service.hospital_id == hospital.id
        ).count(),
    }


# ========================================================
# 2. LIST NURSES IN THIS HOSPITAL
# GET /hospital-admin/nurses
# ========================================================

@router.get("/nurses")
def get_hospital_nurses(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    nurses = (
        db.query(models.User)
        .filter(
            models.User.role == "nurse",
            models.User.hospital_id == current_user.hospital_id,
        )
        .order_by(models.User.id.asc())
        .all()
    )

    result = []

    for nurse in nurses:
        service = None

        if nurse.service_id is not None:
            service = (
                db.query(models.Service)
                .filter(
                    models.Service.id == nurse.service_id,
                    models.Service.hospital_id == current_user.hospital_id,
                )
                .first()
            )

        result.append({
            "id": nurse.id,
            "name": nurse.name,
            "email": nurse.email,
            "position": nurse.position,
            "hospital_id": nurse.hospital_id,
            "service_id": nurse.service_id,
            "service_name": service.name if service else None,
            "approval_status": nurse.approval_status,
        })

    return result


# ========================================================
# 3. UPDATE NURSE POSITION AND DEPARTMENT
# PATCH /hospital-admin/nurses/{user_id}
# ========================================================

@router.patch("/nurses/{user_id}")
def update_hospital_nurse(
    user_id: int,
    data: schemas.HospitalNurseUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    nurse = (
        db.query(models.User)
        .filter(
            models.User.id == user_id,
            models.User.role == "nurse",
            models.User.hospital_id == current_user.hospital_id,
        )
        .first()
    )

    if nurse is None:
        raise HTTPException(
            status_code=404,
            detail="Nurse not found in your hospital.",
        )

    fields = data.model_fields_set
    allowed_fields = {"position", "service_id"}

    if not fields or not fields.issubset(allowed_fields):
        raise HTTPException(
            status_code=400,
            detail="Provide position or service_id to update.",
        )

    if "position" in fields:
        position = data.position

        if position is not None:
            position = position.strip()

            if not position:
                raise HTTPException(
                    status_code=400,
                    detail="Position must not be empty.",
                )

            if len(position) > 100:
                raise HTTPException(
                    status_code=400,
                    detail="Position must be 100 characters or fewer.",
                )

        nurse.position = position

    if "service_id" in fields:
        service_id = data.service_id

        if service_id is None:
            nurse.service_id = None
        else:
            service = (
                db.query(models.Service)
                .filter(
                    models.Service.id == service_id,
                    models.Service.hospital_id == current_user.hospital_id,
                )
                .first()
            )

            if service is None:
                raise HTTPException(
                    status_code=400,
                    detail="Service does not belong to your hospital.",
                )

            nurse.service_id = service.id

    try:
        db.commit()
        db.refresh(nurse)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update nurse.",
        )

    return {
        "message": "Nurse updated successfully.",
        "id": nurse.id,
        "name": nurse.name,
        "position": nurse.position,
        "service_id": nurse.service_id,
        "hospital_id": nurse.hospital_id,
    }


# ========================================================
# 4. LIST SERVICES IN THIS HOSPITAL
# GET /hospital-admin/services
# ========================================================

@router.get("/services")
def get_hospital_services(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    services = (
        db.query(models.Service)
        .filter(
            models.Service.hospital_id == current_user.hospital_id
        )
        .order_by(models.Service.id.asc())
        .all()
    )

    return [
        {
            "id": service.id,
            "name": service.name,
            "description": service.description,
            "hospital_id": service.hospital_id,
        }
        for service in services
    ]


# ========================================================
# 5. LIST PENDING NURSE REQUESTS
# GET /hospital-admin/nurse-requests
# ========================================================

@router.get("/nurse-requests")
def get_hospital_nurse_requests(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    nurses = (
        db.query(models.User)
        .filter(
            models.User.role == "nurse",
            models.User.hospital_id == current_user.hospital_id,
            models.User.approval_status == "pending",
        )
        .order_by(models.User.id.asc())
        .all()
    )

    return [
        {
            "id": nurse.id,
            "name": nurse.name,
            "email": nurse.email,
            "position": nurse.position,
            "hospital_id": nurse.hospital_id,
            "approval_status": nurse.approval_status,
        }
        for nurse in nurses
    ]


# ========================================================
# 6. APPROVE OR REJECT NURSE REQUEST
# PATCH /hospital-admin/nurse-requests/{user_id}
# ========================================================

@router.patch("/nurse-requests/{user_id}")
def update_hospital_nurse_request(
    user_id: int,
    decision: schemas.NurseDecision,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    nurse = (
        db.query(models.User)
        .filter(
            models.User.id == user_id,
            models.User.role == "nurse",
            models.User.hospital_id == current_user.hospital_id,
        )
        .first()
    )

    if nurse is None:
        raise HTTPException(
            status_code=404,
            detail="Nurse request not found in your hospital.",
        )

    if nurse.approval_status != "pending":
        raise HTTPException(
            status_code=400,
            detail="This nurse request has already been processed.",
        )

    if decision.approval_status == "approved":
        if decision.position is not None:
            position = decision.position.strip()

            if not position:
                raise HTTPException(
                    status_code=400,
                    detail="Position must not be empty.",
                )

            nurse.position = position

        nurse.approval_status = "approved"
    else:
        nurse.approval_status = "rejected"

    try:
        db.commit()
        db.refresh(nurse)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update nurse request.",
        )

    return {
        "message": f"Nurse request {nurse.approval_status}.",
        "id": nurse.id,
        "name": nurse.name,
        "email": nurse.email,
        "hospital_id": nurse.hospital_id,
        "approval_status": nurse.approval_status,
        "position": nurse.position,
    }


# ========================================================
# 7. GET CURRENT HOSPITAL PACKAGE
# GET /hospital-admin/subscription/package
# ========================================================

@router.get("/subscription/package")
def get_hospital_package(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    hospital = get_current_hospital(db, current_user)

    return {
        "hospital_id": hospital.id,
        "hospital_name": hospital.name,
        "package": hospital.package,
        "subscription_status": hospital.subscription_status,
        "subscription_started_at": hospital.subscription_started_at,
        "subscription_expires_at": hospital.subscription_expires_at,
    }


# ========================================================
# 8. CHANGE HOSPITAL PACKAGE
# POST /hospital-admin/subscription/package
#
# Body:
# {"package": "free"}
# or
# {"package": "pro"}
#
# Demo selection only. No payment is processed.
# ========================================================

@router.post("/subscription/package")
def change_hospital_package(
    package: str = Body(..., embed=True),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    hospital = get_current_hospital(db, current_user)

    selected_package = package.strip().lower()

    if selected_package not in AVAILABLE_PACKAGES:
        raise HTTPException(
            status_code=400,
            detail="Package must be either free or pro.",
        )

    if hospital.package == selected_package:
        return {
            "message": "This package is already active.",
            "hospital_id": hospital.id,
            "package": hospital.package,
            "subscription_status": hospital.subscription_status,
            "subscription_started_at": hospital.subscription_started_at,
            "subscription_expires_at": hospital.subscription_expires_at,
            "payment_required": False,
        }

    now = utc_now()

    hospital.package = selected_package
    hospital.subscription_status = "active"

    if selected_package == "pro":
        # Direct Pro activation for demonstration only.
        # No payment record is created.
        hospital.subscription_started_at = now
        hospital.subscription_expires_at = None
    else:
        hospital.subscription_started_at = None
        hospital.subscription_expires_at = None

    try:
        db.commit()
        db.refresh(hospital)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to change hospital package.",
        )

    return {
        "message": "Hospital package changed successfully.",
        "hospital_id": hospital.id,
        "package": hospital.package,
        "subscription_status": hospital.subscription_status,
        "subscription_started_at": hospital.subscription_started_at,
        "subscription_expires_at": hospital.subscription_expires_at,
        "payment_required": False,
        "demo_notice": "No real payment has been processed.",
    }


# ========================================================
# 9. CREATE DEMO PRO PAYMENT
# POST /hospital-admin/subscription/demo
# ========================================================

@router.post("/subscription/demo")
def create_demo_subscription_payment(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    hospital = get_current_hospital(db, current_user)
    now = utc_now()

    existing_payment = (
        db.query(models.SubscriptionPayment)
        .filter(
            models.SubscriptionPayment.hospital_id == hospital.id,
            models.SubscriptionPayment.status == "pending",
            models.SubscriptionPayment.is_demo.is_(True),
        )
        .order_by(models.SubscriptionPayment.id.desc())
        .first()
    )

    if existing_payment:
        return {
            **payment_to_dict(existing_payment),
            "hospital_name": hospital.name,
            "demo_notice": (
                "Simulated payment only. No real PromptPay payment "
                "has been made or verified."
            ),
        }

    if (
        hospital.package == "pro"
        and hospital.subscription_expires_at is not None
        and as_utc(hospital.subscription_expires_at) > now
    ):
        raise HTTPException(
            status_code=409,
            detail="Your hospital already has an active Pro subscription.",
        )

    payment = models.SubscriptionPayment(
        hospital_id=hospital.id,
        amount=PRO_PRICE,
        package="pro",
        payment_method="promptpay_demo",
        reference=f"DEMO-{uuid.uuid4().hex[:16].upper()}",
        status="pending",
        is_demo=True,
    )

    try:
        db.add(payment)
        db.commit()
        db.refresh(payment)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create demo payment.",
        )

    return {
        **payment_to_dict(payment),
        "hospital_name": hospital.name,
        "demo_notice": (
            "Simulated payment only. No real PromptPay payment "
            "has been made or verified."
        ),
    }


# ========================================================
# 10. LIST SUBSCRIPTION PAYMENTS
# GET /hospital-admin/subscription/payments
# ========================================================

@router.get("/subscription/payments")
def get_my_subscription_payments(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    payments = (
        db.query(models.SubscriptionPayment)
        .filter(
            models.SubscriptionPayment.hospital_id
            == current_user.hospital_id
        )
        .order_by(
            models.SubscriptionPayment.created_at.desc(),
            models.SubscriptionPayment.id.desc(),
        )
        .all()
    )

    return [payment_to_dict(payment) for payment in payments]


# ========================================================
# 11. CONFIRM DEMO PAYMENT
# POST /hospital-admin/subscription/demo/{payment_id}/confirm
# ========================================================

@router.post("/subscription/demo/{payment_id}/confirm")
def confirm_demo_subscription_payment(
    payment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_hospital_admin),
):
    hospital = get_current_hospital(db, current_user)

    payment = (
        db.query(models.SubscriptionPayment)
        .filter(
            models.SubscriptionPayment.id == payment_id,
            models.SubscriptionPayment.hospital_id == hospital.id,
        )
        .with_for_update()
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=404,
            detail="Payment not found for your hospital.",
        )

    if not payment.is_demo or payment.payment_method != "promptpay_demo":
        raise HTTPException(
            status_code=400,
            detail="This endpoint only supports simulated demo payments.",
        )

    # Prevent extending a subscription more than once.
    if payment.status == "paid":
        return {
            "message": "This demo payment was already confirmed.",
            "payment": payment_to_dict(payment),
            "package": hospital.package,
            "subscription_status": hospital.subscription_status,
            "subscription_started_at": hospital.subscription_started_at,
            "subscription_expires_at": hospital.subscription_expires_at,
            "is_demo": True,
        }

    if payment.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="This payment cannot be confirmed.",
        )

    now = utc_now()

    current_expiry = hospital.subscription_expires_at

    if (
        hospital.package == "pro"
        and current_expiry is not None
        and as_utc(current_expiry) > now
    ):
        expiry_base = as_utc(current_expiry)
    else:
        expiry_base = now
        hospital.subscription_started_at = now

    new_expiry = add_one_calendar_month(expiry_base)

    payment.status = "paid"
    payment.paid_at = now

    hospital.package = "pro"
    hospital.subscription_status = "active"
    hospital.subscription_expires_at = new_expiry

    try:
        db.commit()
        db.refresh(payment)
        db.refresh(hospital)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to confirm demo payment.",
        )

    return {
        "message": (
            "Demo payment confirmed. Pro subscription activated "
            "for demonstration purposes only."
        ),
        "payment": payment_to_dict(payment),
        "package": hospital.package,
        "subscription_status": hospital.subscription_status,
        "subscription_started_at": hospital.subscription_started_at,
        "subscription_expires_at": hospital.subscription_expires_at,
        "is_demo": True,
    }
