
import pytest
from fastapi.testclient import TestClient
from backend.user_service import app

import uuid

TEST_EMAIL = f"pytest_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "Test@12345"

client = TestClient(app)

def test_user_service_home():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_user_registration():
    response = client.post(
        "/register",
        json={
            "full_name": "Test User",
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "role": "teacher"
        }
    )

    assert response.status_code == 200
    assert response.json()["message"] == "User registered successfully"

def test_duplicate_user_registration():
    response = client.post(
        "/register",
        json={
            "full_name": "Test User",
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "role": "teacher"
        }
    )

    assert response.status_code == 400

def test_user_login():
    response = client.post(
        "/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        }
    )

    assert response.status_code == 200
    assert response.json()["email"] == TEST_EMAIL
    assert response.json()["role"] == "teacher"

def test_invalid_user_login():
    response = client.post(
        "/login",
        json={
            "email": TEST_EMAIL,
            "password": "WrongPassword123",
        }
    )

    assert response.status_code == 401