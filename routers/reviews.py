from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database, security

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)

# 1. Create a review
@router.post("/", response_model=schemas.ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: schemas.ReviewCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    new_review = models.Review(
        user_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

# 2. Get all reviews
@router.get("/", response_model=List[schemas.ReviewResponse])
def get_reviews(db: Session = Depends(database.get_db)):
    return db.query(models.Review).all()