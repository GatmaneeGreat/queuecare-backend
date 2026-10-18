
import uuid

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


# ========================================================
# HOSPITAL
# ========================================================

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False, unique=True)

    package = Column(
        String(10),
        nullable=False,
        default="free",
        server_default="free",
    )

    subscription_status = Column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Subscription dates
    subscription_started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    subscription_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    users = relationship(
        "User",
        back_populates="hospital",
    )

    subscription_payments = relationship(
        "SubscriptionPayment",
        back_populates="hospital",
        order_by="SubscriptionPayment.created_at.desc()",
    )


# ========================================================
# USER
# ========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    hashed_password = Column(String, nullable=False)

    role = Column(String, default="customer")

    position = Column(String, nullable=True)

    hospital_id = Column(
        Integer,
        ForeignKey("hospitals.id"),
        nullable=True,
    )

    service_id = Column(
        Integer,
        ForeignKey("services.id"),
        nullable=True,
    )

    approval_status = Column(
        String(20),
        nullable=False,
        default="approved",
        server_default="approved",
    )

    hospital = relationship(
        "Hospital",
        back_populates="users",
    )

    service = relationship(
        "Service",
        back_populates="nurses",
    )

    queues = relationship(
        "Queue",
        back_populates="user",
    )

    reviews = relationship(
        "Review",
        back_populates="user",
    )


# ========================================================
# SERVICE
# ========================================================

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    description = Column(Text, nullable=True)

    hospital_id = Column(
        Integer,
        ForeignKey("hospitals.id"),
        nullable=True,
    )

    hospital = relationship("Hospital")

    nurses = relationship(
        "User",
        back_populates="service",
    )

    queues = relationship(
        "Queue",
        back_populates="service",
    )


# ========================================================
# QUEUE
# ========================================================

class Queue(Base):
    __tablename__ = "queues"

    id = Column(Integer, primary_key=True, index=True)

    number = Column(String, nullable=False)

    status = Column(String, default="waiting")

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
    )

    service_id = Column(
        Integer,
        ForeignKey("services.id"),
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    share_token = Column(
        String(36),
        default=lambda: str(uuid.uuid4()),
        unique=True,
        index=True,
    )

    user = relationship(
        "User",
        back_populates="queues",
    )

    service = relationship(
        "Service",
        back_populates="queues",
    )


# ========================================================
# QUEUE TRANSACTION
# ========================================================

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    queue_id = Column(
        Integer,
        ForeignKey("queues.id"),
    )

    amount = Column(Integer, nullable=False)

    status = Column(String, default="pending")


# ========================================================
# REVIEW
# ========================================================

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
    )

    rating = Column(Integer, nullable=False)

    comment = Column(Text, nullable=True)

    user = relationship(
        "User",
        back_populates="reviews",
    )


# ========================================================
# SUBSCRIPTION PAYMENT
# ========================================================

class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"

    id = Column(Integer, primary_key=True, index=True)

    hospital_id = Column(
        Integer,
        ForeignKey("hospitals.id"),
        nullable=False,
        index=True,
    )

    amount = Column(
        Integer,
        nullable=False,
        default=799,
    )

    package = Column(
        String(10),
        nullable=False,
        default="pro",
    )

    payment_method = Column(
        String(30),
        nullable=False,
        default="promptpay_demo",
    )

    reference = Column(
        String(100),
        nullable=True,
        unique=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )

    is_demo = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    paid_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    hospital = relationship(
        "Hospital",
        back_populates="subscription_payments",
    )
