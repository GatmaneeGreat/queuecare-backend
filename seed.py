import bcrypt
from database import SessionLocal
from models import User

def create_nurse_account():
    db = SessionLocal()
    try:
        # ตรวจสอบว่ามีบัญชี nurse@hospital.com อยู่หรือยัง
        nurse = db.query(User).filter(User.email == "nurse@hospital.com").first()
        
        if not nurse:
            # ใช้ bcrypt เข้ารหัสรหัสผ่าน
            password_bytes = "password123".encode('utf-8')
            salt = bcrypt.gensalt()
            hashed_pw = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
            
            # บันทึกลงฐานข้อมูล (ใส่ name เรียบร้อยแล้ว)
            new_nurse = User(
                name="Nurse Station",  # <-- เพิ่มชื่อตรงนี้เข้ามาแล้วครับ
                email="nurse@hospital.com",
                hashed_password=hashed_pw,
                role="nurse"
            )
            db.add(new_nurse)
            db.commit()
            print("✅ เพิ่มบัญชี nurse@hospital.com ลงฐานข้อมูลสำเร็จแล้ว!")
        else:
            print("ℹ️ มีบัญชี nurse@hospital.com ในระบบเรียบร้อยแล้ว")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_nurse_account()