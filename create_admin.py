
import getpass

import database
import models
import security


def main():
    db = database.SessionLocal()

    try:
        name = input("Admin name: ").strip()
        email = input("Admin email: ").strip().lower()
        password = getpass.getpass("Admin password: ")

        if not name or not email or len(password) < 8:
            print("Please enter a name, valid email, and password of at least 8 characters.")
            return

        existing_user = (
            db.query(models.User)
            .filter(models.User.email == email)
            .first()
        )

        if existing_user:
            print("This email already exists. No account was created.")
            return

        admin = models.User(
            name=name,
            email=email,
            hashed_password=security.hash_password(password),
            role="admin",
            approval_status="approved",
        )

        db.add(admin)
        db.commit()

        print("Admin account created successfully.")
        print(f"Email: {email}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
