from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database, security

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions "]
)

# 1. บันทึกการชำระเงิน
@router.post("/", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: schemas.TransactionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    # เช็กว่าคิวนี้มีอยู่จริงไหม
    queue = db.query(models.Queue).filter(models.Queue.id == payload.queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลคิวนี้")

    new_transaction = models.Transaction(
        queue_id=payload.queue_id,
        amount=payload.amount,
        status=payload.status
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

# 2. ดูประวัติการชำระเงินทั้งหมด
@router.get("/", response_model=List[schemas.TransactionResponse])
def get_transactions(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return db.query(models.Transaction).all()

# 3. ดูรายละเอียดตาม Transaction ID
@router.get("/{transaction_id}", response_model=schemas.TransactionResponse)
def get_transaction_detail(
    transaction_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลรายการชำระเงิน")
    return transaction