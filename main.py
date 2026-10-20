
import os

os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from pathlib import Path
from typing import List, Optional

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db, engine, SessionLocal
import models
import schemas
import security

from routers import (
    auth,
    services,
    queues,
    transactions,
    reviews,
    admin,
    hospital_admin,
)


# ========================================================
# DATABASE
# ========================================================

# Create tables that do not already exist.
# Existing tables will not have new columns added by create_all().
models.Base.metadata.create_all(bind=engine)


# ========================================================
# FASTAPI APPLICATION
# ========================================================

app = FastAPI(title="QueueCare API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static",
)

templates = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)


# ========================================================
# AUTO-SETUP & AUTO-SEED
# ========================================================

@app.on_event("startup")
def auto_setup_and_seed():
    db = SessionLocal()

    try:
        # ------------------------------------------------
        # 1. Ensure existing columns exist
        # ------------------------------------------------

        db.execute(text("""
            ALTER TABLE queues
            ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);
        """))

        db.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS position VARCHAR;
        """))

        db.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS hospital_id INTEGER
            REFERENCES hospitals(id);
        """))

        db.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS approval_status
            VARCHAR(20) NOT NULL DEFAULT 'approved';
        """))

        db.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS service_id INTEGER
            REFERENCES services(id);
        """))

        db.execute(text("""
            ALTER TABLE services
            ADD COLUMN IF NOT EXISTS hospital_id INTEGER
            REFERENCES hospitals(id);
        """))

        # ------------------------------------------------
        # 2. Subscription columns
        # ------------------------------------------------

        db.execute(text("""
            ALTER TABLE hospitals
            ADD COLUMN IF NOT EXISTS subscription_started_at
            TIMESTAMPTZ;
        """))

        db.execute(text("""
            ALTER TABLE hospitals
            ADD COLUMN IF NOT EXISTS subscription_expires_at
            TIMESTAMPTZ;
        """))

        # ------------------------------------------------
        # 3. Create subscription payment table if missing
        # ------------------------------------------------

        # The SubscriptionPayment model must exist in models.py.
        # create_all() above creates this table for new databases.
        # This statement also ensures it exists on existing databases.
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS subscription_payments (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL
                    REFERENCES hospitals(id),
                amount INTEGER NOT NULL DEFAULT 799,
                package VARCHAR(10) NOT NULL DEFAULT 'pro',
                payment_method VARCHAR(30) NOT NULL
                    DEFAULT 'promptpay_demo',
                reference VARCHAR(100) UNIQUE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                is_demo BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                paid_at TIMESTAMPTZ
            );
        """))

        db.execute(text("""
            CREATE INDEX IF NOT EXISTS
            ix_subscription_payments_hospital_id
            ON subscription_payments (hospital_id);
        """))

        db.execute(text("""
            CREATE INDEX IF NOT EXISTS
            ix_subscription_payments_status
            ON subscription_payments (status);
        """))

        db.commit()

        # ------------------------------------------------
        # 4. Create example hospital if missing
        # ------------------------------------------------

        hospital = (
            db.query(models.Hospital)
            .filter(
                models.Hospital.name == "โรงพยาบาลตัวอย่าง"
            )
            .first()
        )

        if hospital is None:
            hospital = models.Hospital(
                name="โรงพยาบาลตัวอย่าง",
                package="free",
                subscription_status="active",
            )

            db.add(hospital)
            db.flush()

        # ------------------------------------------------
        # 5. Create example nurse if missing
        # ------------------------------------------------

        nurse_user = (
            db.query(models.User)
            .filter(
                models.User.email == "nurse@hospital.com"
            )
            .first()
        )

        if nurse_user is None:
            nurse_user = models.User(
                name="Nurse Station",
                email="nurse@hospital.com",
                hashed_password=security.hash_password(
                    "password123"
                ),
                role="nurse",
                position="พยาบาลประจำจุดบริการ",
                hospital_id=hospital.id,
                approval_status="approved",
            )

            db.add(nurse_user)

        else:
            if nurse_user.hospital_id is None:
                nurse_user.hospital_id = hospital.id

            if not nurse_user.position:
                nurse_user.position = (
                    "พยาบาลประจำจุดบริการ"
                )

        # ------------------------------------------------
        # 6. Create example services if missing
        # ------------------------------------------------

        default_services = [
            {
                "id": 1,
                "name": "แผนกอายุรกรรม (General Medical)",
            },
            {
                "id": 2,
                "name": "แผนกศัลยกรรม (Surgery)",
            },
            {
                "id": 3,
                "name": "แผนกกุมารเวชกรรม (Pediatrics)",
            },
            {
                "id": 4,
                "name": (
                    "แผนกสูตินรีเวชกรรม "
                    "(Obstetrics & Gynecology)"
                ),
            },
            {
                "id": 5,
                "name": "แผนกจักษุวิทยา (Ophthalmology)",
            },
            {
                "id": 6,
                "name": "แผนกทันตกรรม (Dental Clinic)",
            },
            {
                "id": 7,
                "name": "แผนกกระดูกและข้อ (Orthopedics)",
            },
            {
                "id": 8,
                "name": (
                    "แผนกอุบัติเหตุและฉุกเฉิน "
                    "(Emergency Room)"
                ),
            },
        ]

        for service_data in default_services:
            existing_service = (
                db.query(models.Service)
                .filter(
                    models.Service.id == service_data["id"]
                )
                .first()
            )

            if existing_service is None:
                db.add(
                    models.Service(
                        id=service_data["id"],
                        name=service_data["name"],
                        hospital_id=hospital.id,
                    )
                )

        db.commit()

        print(
            "🟢 [System Ready] "
            "Database setup and seed completed!"
        )

    except Exception as e:
        db.rollback()

        print(
            f"🔴 [Startup Error] "
            f"Auto setup failed: {e}"
        )

    finally:
        db.close()


# ========================================================
# REGISTER ROUTERS
# ========================================================

app.include_router(auth.router)
app.include_router(services.router)
app.include_router(queues.router)
app.include_router(transactions.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(hospital_admin.router)


# ========================================================
# FRONTEND PAGES
# ========================================================


from fastapi.responses import RedirectResponse


@app.get("/")
@app.get("/splash")
def splash_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="splash.html",
    )


@app.get("/home")
def home_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


@app.get("/nurse")
def nurse_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="nurse.html",
    )


@app.get("/track", include_in_schema=False)
def track_without_token():
    return RedirectResponse(
        url="/home",
        status_code=302,
    )


@app.get("/track/{token}")
def track_page(
    request: Request,
    token: str,
):
    return templates.TemplateResponse(
        request=request,
        name="track.html",
        context={"token": token},
    )


# ========================================================
# GENERAL API ENDPOINTS
# ========================================================

@app.get("/api-status")
def api_status():
    return {
        "message": "Welcome to QueueCare API"
    }


@app.get("/test-db")
def test_db(
    db: Session = Depends(get_db),
):
    try:
        result = db.execute(
            text("SELECT NOW()")
        ).fetchone()

        return {
            "status": "success",
            "db_time": str(result[0]),
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed",
        )


# ========================================================
# USER ENDPOINTS
# ========================================================

@app.post(
    "/users",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    email = str(user.email).strip().lower()
    name = user.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="กรุณาระบุชื่อ",
        )

    if user.role and user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่อนุญาตให้กำหนด role นี้ผ่าน API",
        )

    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="กรุณาใช้ /auth/register เพื่อสมัครสมาชิก",
    )


@app.get(
    "/users",
    response_model=List[schemas.UserResponse],
)
def get_users(
    current_user: models.User = Depends(
        security.require_roles(["admin"])
    ),
    db: Session = Depends(get_db),
):
    return db.query(models.User).all()