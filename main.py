from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

app = FastAPI(title="QueueCare API")


@app.get("/")
def read_root():
    return {"message": "Welcome to QueueCare API"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT NOW()")).fetchone()
        return {"status": "success", "db_time": str(result[0])}
    except Exception as e:
        return {"status": "error", "message": str(e)}