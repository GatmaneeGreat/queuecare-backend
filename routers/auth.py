
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import database
import models
import schemas
import security

router = APIRouter(prefix="/auth", tags=["Authentication"])

# =========================================================
# 1. GET HOSPITALS: Public list for nurse registration
# =========================================================

@router.get("/hospitals")
def get_registration_hospitals(
    db: Session = Depends(database.get_db)
):
    hospitals = (
        db.query(models.Hospital)
        .order_by(models.Hospital.name.asc())
        .all()
    )

    return [
        {
            "id": hospital.id,
            "name": hospital.name
        }
        for hospital in hospitals
    ]


# =========================================================
# 2. REGISTER: New nurse accounts require approval
# =========================================================

@router.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user_data: schemas.UserRegister,
    db: Session = Depends(database.get_db)
):
    name = user_data.name.strip()
    email = str(user_data.email).strip().lower()

    # โค้ด register ส่วนที่เหลือของเธอ
    # ให้คงไว้ต่อจากตรงนี้
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter your name."
        )

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address is already registered."
        )
    
    hospital = (
        db.query(models.Hospital)
        .filter(
            models.Hospital.id == user_data.hospital_id
        )
        .first()
    )

    if hospital is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found. Please select a valid hospital."
        )

    new_user = models.User(
        name=name,
        email=email,
        hashed_password=security.hash_password(user_data.password),
        role="nurse",
        approval_status="pending",
        position=None,
        hospital_id=hospital.id
    )
    

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create your account. Please try again."
        )

    return new_user


# =========================================================
# 2. LOGIN: Return an access token only for approved accounts
# =========================================================

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    email = form_data.username.strip().lower()

    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if not user or not security.verify_password(
        form_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Only nurse accounts need approval.
    # Existing customers and administrators retain their current behavior.
    if (
        user.role == "nurse"
        and getattr(user, "approval_status", "approved") != "approved"
    ):
        if user.approval_status == "rejected":
            message = "Your registration request was rejected. Please contact your administrator."
        else:
            message = "Your account is awaiting administrator approval."

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message
        )

    access_token = security.create_access_token(
        data={"sub": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =========================================================
# 3. CURRENT USER: Return the authenticated user's profile
# =========================================================

@router.get("/me", response_model=schemas.NurseProfileResponse)
def get_me(
    current_user: models.User = Depends(security.get_current_user)
):
    hospital = getattr(current_user, "hospital", None)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "position": getattr(current_user, "position", None),
        "hospital_id": getattr(current_user, "hospital_id", None),
        "hospital_name": hospital.name if hospital else None,
        "package": hospital.package if hospital else None,
        "subscription_status": (
            hospital.subscription_status if hospital else None
        ),
        "approval_status": getattr(
            current_user, "approval_status", "approved"
        )
    }
