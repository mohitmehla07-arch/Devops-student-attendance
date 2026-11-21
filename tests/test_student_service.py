
from fastapi.testclient import TestClient
from backend.student_service import app

client = TestClient(app)


def test_student_service_home():
    response = client.get("/")
    assert response.status_code == 200


def test_add_student():
    response = client.post(
        "/students",
        json={
            "admission_number": "TEST001",
            "full_name": "Oliver Test",
            "email": "oliver.test@example.co.uk",
            "course": "Computer Science",
            "semester": 1,
            "phone": "07700900100"
        }
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Student added successfully"


def test_get_students():
    response = client.get("/students")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_student():
    response = client.get("/students")

    students = response.json()
    student = next(
        (s for s in students if s["admission_number"] == "TEST001"),
        None
    )

    assert student is not None

    student_response = client.get(
        f"/students/{student['student_id']}"
    )

    assert student_response.status_code == 200
    assert student_response.json()["admission_number"] == "TEST001"


def test_update_student():
    response = client.get("/students")
    students = response.json()

    student = next(
        (s for s in students if s["admission_number"] == "TEST001"),
        None
    )

    assert student is not None

    update_response = client.put(
        f"/students/{student['student_id']}",
        json={
            "admission_number": "TEST001",
            "full_name": "Oliver Updated",
            "email": "oliver.test@example.co.uk",
            "course": "Software Engineering",
            "semester": 2,
            "phone": "07700900100"
        }
    )

    assert update_response.status_code == 200
    assert update_response.json()["message"] == "Student updated successfully"


def test_delete_student():
    response = client.get("/students")
    students = response.json()

    student = next(
        (s for s in students if s["admission_number"] == "TEST001"),
        None
    )

    assert student is not None

    delete_response = client.delete(
        f"/students/{student['student_id']}"
    )

    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Student deleted successfully"
