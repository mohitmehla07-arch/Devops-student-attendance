
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from backend.database import engine
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Student Management Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Student(BaseModel):
    admission_number: str
    full_name: str = Field(min_length=2)
    email: EmailStr
    course: str
    semester: int = Field(ge=1)
    phone: str


@app.get("/")
def home():
    return {"message": "Student Management Service is running"}


@app.post("/students")
def add_student(student: Student):
    try:
        with engine.begin() as connection:
            connection.execute(
                text("""
                    INSERT INTO students
                    (admission_number, full_name, email,
                     course, semester, phone)
                    VALUES
                    (:admission_number, :full_name, :email,
                     :course, :semester, :phone)
                """),
                student.model_dump()
            )

        return {"message": "Student added successfully"}

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Admission number or email already exists"
        )


@app.get("/students")
def get_students():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT * FROM students ORDER BY student_id DESC")
        )
        return [dict(row) for row in result.mappings()]


@app.get("/students/{student_id}")
def get_student(student_id: int):
    with engine.connect() as connection:
        student = connection.execute(
            text("SELECT * FROM students WHERE student_id = :id"),
            {"id": student_id}
        ).mappings().first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return dict(student)


@app.put("/students/{student_id}")
def update_student(student_id: int, student: Student):
    try:
        with engine.begin() as connection:
            result = connection.execute(
                text("""
                    UPDATE students
                    SET admission_number = :admission_number,
                        full_name = :full_name,
                        email = :email,
                        course = :course,
                        semester = :semester,
                        phone = :phone
                    WHERE student_id = :student_id
                """),
                {
                    **student.model_dump(),
                    "student_id": student_id
                }
            )

            if result.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Student not found"
                )

        return {"message": "Student updated successfully"}

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Admission number or email already exists"
        )


@app.delete("/students/{student_id}")
def delete_student(student_id: int):
    with engine.begin() as connection:
        result = connection.execute(
            text("DELETE FROM students WHERE student_id = :id"),
            {"id": student_id}
        )

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Student not found"
            )

    return {"message": "Student deleted successfully"}
