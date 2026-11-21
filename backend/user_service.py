
import hashlib
import secrets

from typing import Literal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine

app = FastAPI(title="User Authentication Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password hashing
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        100000
    ).hex()

    return f"{salt}${password_hash}"


# Password verification
def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, original_hash = stored_hash.split("$")

        new_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode(),
            salt.encode(),
            100000
        ).hex()

        return secrets.compare_digest(new_hash, original_hash)

    except ValueError:
        return False


# Request model
class UserRegister(BaseModel):
    full_name: str = Field(min_length=2)
    email: str
    password: str = Field(min_length=8)
    role: Literal["admin", "teacher"]


class UserLogin(BaseModel):
    email: str
    password: str


# Health check
@app.get("/")
def home():
    return {"message": "User Authentication Service is running"}


# Register user
@app.post("/register")
def register_user(user: UserRegister):
    password_hash = hash_password(user.password)

    try:
        with engine.begin() as connection:
            connection.execute(
                text("""
                    INSERT INTO users
                    (full_name, email, password_hash, role)
                    VALUES (:full_name, :email, :password_hash, :role)
                """),
                {
                    "full_name": user.full_name,
                    "email": user.email,
                    "password_hash": password_hash,
                    "role": user.role
                }
            )

        return {"message": "User registered successfully"}

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )


@app.post("/login")
def login_user(user: UserLogin):
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT user_id, full_name, email, password_hash, role
                FROM users
                WHERE email = :email
            """),
            {"email": user.email}
        ).mappings().first()

    if not result or not verify_password(
        user.password, result["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return {
        "message": "Login successful",
        "user_id": result["user_id"],
        "full_name": result["full_name"],
        "email": result["email"],
        "role": result["role"]
    }