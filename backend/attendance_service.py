
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from backend.database import engine
from datetime import date
from typing import Literal

app = FastAPI(title="Attendance Management Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AttendanceCreate(BaseModel):
    student_id: int
    marked_by: int
    attendance_date: date
    status: Literal["Present", "Absent"]


class AttendanceUpdate(BaseModel):
    status: Literal["Present", "Absent"]


@app.get("/")
def home():
    return {"message": "Attendance Service is running"}


@app.post("/attendance")
def mark_attendance(data: AttendanceCreate):

    if data.status not in ["Present", "Absent"]:
        raise HTTPException(status_code=400, detail="Invalid attendance status")

    try:
        with engine.begin() as connection:
            result = connection.execute(
                text("""
                    INSERT INTO attendance
                    (student_id, marked_by, attendance_date, status)
                    VALUES
                    (:student_id, :marked_by, :attendance_date, :status)
                """),
                data.model_dump()
            )

            return {
                "message": "Attendance marked successfully",
                "attendance_id": result.lastrowid
            }

    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.get("/attendance")
def get_attendance(attendance_date: date = None):

    query = """
        SELECT
            a.attendance_id,
            a.student_id,
            s.full_name AS student_name,
            s.admission_number,
            a.marked_by,
            u.full_name AS marked_by_name,
            a.attendance_date,
            a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        JOIN users u ON a.marked_by = u.user_id
    """

    if attendance_date:
        query += " WHERE a.attendance_date = :attendance_date"

    query += " ORDER BY a.attendance_date DESC, a.attendance_id DESC"

    with engine.connect() as connection:
        records = connection.execute(
            text(query),
            {"attendance_date": attendance_date} if attendance_date else {}
        ).mappings().all()

    return [
        {
            **dict(row),
            "attendance_date": str(row["attendance_date"])
        }
        for row in records
    ]


@app.put("/attendance/{attendance_id}")
def update_attendance(attendance_id: int, data: AttendanceUpdate):

    if data.status not in ["Present", "Absent"]:
        raise HTTPException(status_code=400, detail="Invalid attendance status")

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                UPDATE attendance
                SET status = :status
                WHERE attendance_id = :attendance_id
            """),
            {
                "status": data.status,
                "attendance_id": attendance_id
            }
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Attendance record not found")

    return {"message": "Attendance updated successfully"}


@app.get("/attendance/summary")
def attendance_summary():

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_records,
                    SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END)
                        AS present_count,
                    SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END)
                        AS absent_count
                FROM attendance
            """)
        ).mappings().first()

    return {
        "total_records": result["total_records"] or 0,
        "present": result["present_count"] or 0,
        "absent": result["absent_count"] or 0
    }


@app.get("/dashboard")
def get_dashboard():

    with engine.connect() as connection:

        total_students = connection.execute(
            text("SELECT COUNT(*) FROM students")
        ).scalar() or 0

        summary = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_records,
                    SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END)
                        AS present_count,
                    SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END)
                        AS absent_count
                FROM attendance
                WHERE attendance_date = CURDATE()
            """)
        ).mappings().first()

        recent_records = connection.execute(
            text("""
                SELECT
                    s.full_name AS student_name,
                    s.admission_number,
                    a.attendance_date,
                    a.status
                FROM attendance a
                JOIN students s ON a.student_id = s.student_id
                ORDER BY a.attendance_date DESC, a.attendance_id DESC
                LIMIT 5
            """)
        ).mappings().all()

    present = summary["present_count"] or 0
    absent = summary["absent_count"] or 0
    total_marked = summary["total_records"] or 0

    attendance_rate = (
        round((present / total_marked) * 100, 1)
        if total_marked > 0 else 0
    )

    return {
        "total_students": total_students,
        "present_today": present,
        "absent_today": absent,
        "attendance_rate": attendance_rate,
        "recent_records": [
            {
                "student_name": row["student_name"],
                "admission_number": row["admission_number"],
                "attendance_date": str(row["attendance_date"]),
                "status": row["status"]
            }
            for row in recent_records
        ]
    }
