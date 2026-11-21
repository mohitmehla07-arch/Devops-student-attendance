const API = {
    users: "http://127.0.0.1:8001",
    students: "http://127.0.0.1:8002",
    attendance: "http://127.0.0.1:8003"
};


function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("attendEaseUser"));
    } catch {
        return null;
    }
}

function escapeHTML(value) {
    const element = document.createElement("span");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function todayDate() {
    const today = new Date();
    const offset = today.getTimezoneOffset();

    return new Date(today.getTime() - offset * 60000)
        .toISOString()
        .split("T")[0];
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || "Something went wrong.");
    }

    return data;
}

function updateAdminName() {
    const user = getCurrentUser();
    const adminName = document.getElementById("adminName");

    if (user && adminName) {
        adminName.textContent = user.full_name;
    }
}


const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const button = loginForm.querySelector("button[type='submit']");

        try {
            button.disabled = true;
            button.textContent = "Signing in...";

            const data = await apiRequest(
                `${API.users}/login`,
                {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                }
            );

            localStorage.setItem(
                "attendEaseUser",
                JSON.stringify(data)
            );

            window.location.href = "dashboard.html";

        } catch (error) {
            alert(error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Sign In";
        }
    });
}


document.querySelectorAll(".nav-link").forEach(link => {
    if (link.textContent.includes("Logout")) {
        link.addEventListener("click", function () {
            localStorage.removeItem("attendEaseUser");
        });
    }
});


async function loadDashboard() {
    try {
        const data = await apiRequest(
            `${API.attendance}/dashboard`
        );

        document.getElementById("totalStudents").textContent =
            data.total_students;

        document.getElementById("presentToday").textContent =
            data.present_today;

        document.getElementById("absentToday").textContent =
            data.absent_today;

        document.getElementById("attendanceRate").textContent =
            data.attendance_rate + "%";

        document.getElementById("overviewRate").textContent =
            data.attendance_rate + "%";

        document.getElementById("overviewPresent").textContent =
            data.present_today;

        document.getElementById("overviewAbsent").textContent =
            data.absent_today;

        const percentage = Math.min(
            100,
            Math.max(0, data.attendance_rate)
        );

        document.querySelector(".progress-circle").style.background =
            `conic-gradient(#2d70c8 0% ${percentage}%, #e9edf4 ${percentage}% 100%)`;

        const tableBody = document.getElementById("recentAttendance");

        if (data.recent_records.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4">No attendance records available.</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = data.recent_records.map(record => `
            <tr>
                <td>${escapeHTML(record.student_name)}</td>
                <td>${escapeHTML(record.admission_number)}</td>
                <td>${escapeHTML(record.attendance_date)}</td>
                <td>
                    <span class="status ${
                        record.status === "Present" ? "present" : "absent"
                    }">
                        ${escapeHTML(record.status)}
                    </span>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Dashboard error:", error);

        document.getElementById("totalStudents").textContent = "—";
        document.getElementById("presentToday").textContent = "—";
        document.getElementById("absentToday").textContent = "—";
        document.getElementById("attendanceRate").textContent = "—";

        document.getElementById("recentAttendance").innerHTML = `
            <tr>
                <td colspan="4">
                    Unable to load dashboard information.
                </td>
            </tr>
        `;
    }
}


let studentsList = [];

const studentForm = document.getElementById("studentForm");
const studentFormSection = document.getElementById("studentFormSection");
const studentTableBody = document.getElementById("studentTableBody");


async function loadStudents() {
    try {
        studentsList = await apiRequest(
            `${API.students}/students`
        );

        renderStudents(studentsList);

        const count = document.getElementById("studentCount");

        if (count) {
            count.textContent = studentsList.length;
        }

        const attendanceCount =
            document.getElementById("attendanceTotalStudents");

        if (attendanceCount) {
            attendanceCount.textContent = studentsList.length;
        }

    } catch (error) {
        console.error("Student loading error:", error);

        if (studentTableBody) {
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        Unable to load student records.
                    </td>
                </tr>
            `;
        }
    }
}


function renderStudents(students) {
    if (!studentTableBody) return;

    if (students.length === 0) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="7">No student records found.</td>
            </tr>
        `;
    } else {
        studentTableBody.innerHTML = students.map(student => `
            <tr>
                <td>${escapeHTML(student.admission_number)}</td>
                <td>${escapeHTML(student.full_name)}</td>
                <td>${escapeHTML(student.email)}</td>
                <td>${escapeHTML(student.course)}</td>
                <td>${escapeHTML(student.semester)}</td>
                <td>${escapeHTML(student.phone)}</td>
                <td>
                    <div class="action-buttons">
                        <button
                            class="edit-button"
                            data-action="edit"
                            data-id="${student.student_id}">
                            Edit
                        </button>

                        <button
                            class="delete-button"
                            data-action="delete"
                            data-id="${student.student_id}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    const info = document.getElementById("studentTableInfo");

    if (info) {
        info.textContent = `Showing ${students.length} student record(s)`;
    }
}

function openStudentForm() {
    if (!studentFormSection) return;

    studentForm.reset();
    document.getElementById("studentId").value = "";
    document.getElementById("studentFormTitle").textContent =
        "Add New Student";

    document.getElementById("saveStudentButton").textContent =
        "Save Student";

    studentFormSection.hidden = false;
    studentFormSection.scrollIntoView({ behavior: "smooth" });
}


function closeStudentForm() {
    if (!studentFormSection) return;

    studentFormSection.hidden = true;
    studentForm.reset();
}


document.getElementById("openStudentForm")
    ?.addEventListener("click", openStudentForm);

document.getElementById("closeStudentForm")
    ?.addEventListener("click", closeStudentForm);

document.getElementById("cancelStudentForm")
    ?.addEventListener("click", closeStudentForm);


if (studentForm) {
    studentForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const studentId = document.getElementById("studentId").value;

        const studentData = {
            admission_number:
                document.getElementById("admissionNumber").value.trim(),

            full_name:
                document.getElementById("fullName").value.trim(),

            email:
                document.getElementById("studentEmail").value.trim(),

            course:
                document.getElementById("course").value.trim(),

            semester:
                Number(document.getElementById("semester").value),

            phone:
                document.getElementById("phone").value.trim()
        };

        const button = document.getElementById("saveStudentButton");

        try {
            button.disabled = true;
            button.textContent = "Saving...";

            const url = studentId
                ? `${API.students}/students/${studentId}`
                : `${API.students}/students`;

            const method = studentId ? "PUT" : "POST";

            const result = await apiRequest(url, {
                method,
                body: JSON.stringify(studentData)
            });

            alert(result.message);

            closeStudentForm();
            await loadStudents();

        } catch (error) {
            alert(error.message);

        } finally {
            button.disabled = false;
            button.textContent = studentId
                ? "Update Student"
                : "Save Student";
        }
    });
}


if (studentTableBody) {
    studentTableBody.addEventListener("click", async function (event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const studentId = Number(button.dataset.id);
        const action = button.dataset.action;

        const student = studentsList.find(
            item => item.student_id === studentId
        );

        if (!student) return;

        if (action === "edit") {
            openStudentForm();

            document.getElementById("studentId").value =
                student.student_id;

            document.getElementById("admissionNumber").value =
                student.admission_number;

            document.getElementById("fullName").value =
                student.full_name;

            document.getElementById("studentEmail").value =
                student.email;

            document.getElementById("course").value =
                student.course;

            document.getElementById("semester").value =
                student.semester;

            document.getElementById("phone").value =
                student.phone;

            document.getElementById("studentFormTitle").textContent =
                "Edit Student";

            document.getElementById("saveStudentButton").textContent =
                "Update Student";
        }

        if (action === "delete") {
            const confirmed = confirm(
                `Are you sure you want to delete ${student.full_name}?`
            );

            if (!confirmed) return;

            try {
                const result = await apiRequest(
                    `${API.students}/students/${studentId}`,
                    { method: "DELETE" }
                );

                alert(result.message);
                await loadStudents();

            } catch (error) {
                alert(error.message);
            }
        }
    });
}


document.getElementById("studentSearch")
    ?.addEventListener("input", function () {
        const search = this.value.toLowerCase().trim();

        const filteredStudents = studentsList.filter(student =>
            student.full_name.toLowerCase().includes(search) ||
            student.admission_number.toLowerCase().includes(search) ||
            student.email.toLowerCase().includes(search)
        );

        renderStudents(filteredStudents);
    });



let attendanceStudents = [];
let existingAttendance = [];

const markAttendanceTable =
    document.getElementById("markAttendanceTable");

const attendanceDateInput =
    document.getElementById("attendanceDate");


async function loadAttendanceStudents() {
    const selectedDate = attendanceDateInput?.value;

    if (!selectedDate) {
        alert("Please select an attendance date.");
        return;
    }

    try {
        const [students, records] = await Promise.all([
            apiRequest(`${API.students}/students`),
            apiRequest(
                `${API.attendance}/attendance?attendance_date=${encodeURIComponent(selectedDate)}`
            )
        ]);

        attendanceStudents = students;
        existingAttendance = records;

        renderAttendanceStudents();
        updateAttendanceSummary(records, students.length);

    } catch (error) {
        alert(error.message);

        if (markAttendanceTable) {
            markAttendanceTable.innerHTML = `
                <tr>
                    <td colspan="5">Unable to load attendance data.</td>
                </tr>
            `;
        }
    }
}


function renderAttendanceStudents() {
    if (!markAttendanceTable) return;

    if (attendanceStudents.length === 0) {
        markAttendanceTable.innerHTML = `
            <tr>
                <td colspan="5">No registered students found.</td>
            </tr>
        `;
        return;
    }

    markAttendanceTable.innerHTML = attendanceStudents.map(student => {
        const existing = existingAttendance.find(
            record => record.student_id === student.student_id
        );

        const status = existing ? existing.status : "";

        return `
            <tr data-student-id="${student.student_id}">
                <td>${escapeHTML(student.admission_number)}</td>
                <td>${escapeHTML(student.full_name)}</td>
                <td>${escapeHTML(student.course)}</td>
                <td>${escapeHTML(student.semester)}</td>
                <td>
                    <select class="attendance-status">
                        <option value="" ${!status ? "selected" : ""}>
                            Select Status
                        </option>

                        <option value="Present"
                            ${status === "Present" ? "selected" : ""}>
                            Present
                        </option>

                        <option value="Absent"
                            ${status === "Absent" ? "selected" : ""}>
                            Absent
                        </option>
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}


document.getElementById("loadAttendance")
    ?.addEventListener("click", loadAttendanceStudents);

document.getElementById("saveAttendance")
    ?.addEventListener("click", async function () {
        if (!markAttendanceTable) return;

        const user = getCurrentUser();

        if (!user || !user.user_id) {
            alert("Please log in again before marking attendance.");
            return;
        }

        const selectedDate = attendanceDateInput.value;

        if (!selectedDate) {
            alert("Please select an attendance date.");
            return;
        }

        const rows = markAttendanceTable.querySelectorAll(
            "tr[data-student-id]"
        );

        if (rows.length === 0) {
            alert("Please load students first.");
            return;
        }

        const button = this;
        const message = document.getElementById("attendanceMessage");

        try {
            button.disabled = true;
            button.textContent = "Saving...";

            for (const row of rows) {
                const studentId = Number(row.dataset.studentId);

                const status = row.querySelector(
                    ".attendance-status"
                ).value;

                if (!status) {
                    throw new Error(
                        "Please select attendance status for every student."
                    );
                }

                const existing = existingAttendance.find(
                    record => record.student_id === studentId
                );

                if (existing) {
                    await apiRequest(
                        `${API.attendance}/attendance/${existing.attendance_id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify({ status })
                        }
                    );

                } else {
                    await apiRequest(
                        `${API.attendance}/attendance`,
                        {
                            method: "POST",
                            body: JSON.stringify({
                                student_id: studentId,
                                marked_by: user.user_id,
                                attendance_date: selectedDate,
                                status: status
                            })
                        }
                    );
                }
            }

            message.textContent = "Attendance saved successfully.";

            await loadAttendanceStudents();
            await loadAttendanceRecords(selectedDate);

        } catch (error) {
            alert(error.message);

        } finally {
            button.disabled = false;
            button.textContent = "Save Attendance";
        }
    });

function updateAttendanceSummary(records, totalStudents) {
    const present = records.filter(
        record => record.status === "Present"
    ).length;

    const absent = records.filter(
        record => record.status === "Absent"
    ).length;

    const rate = records.length > 0
        ? ((present / records.length) * 100).toFixed(1)
        : "0.0";

    document.getElementById("attendanceTotalStudents").textContent =
        totalStudents;

    document.getElementById("attendancePresent").textContent =
        present;

    document.getElementById("attendanceAbsent").textContent =
        absent;

    document.getElementById("attendancePercentage").textContent =
        rate + "%";
}


async function loadAttendanceRecords(selectedDate = "") {
    const tableBody = document.getElementById(
        "attendanceRecordsTable"
    );

    if (!tableBody) return;

    try {
        let url = `${API.attendance}/attendance`;

        if (selectedDate) {
            url += `?attendance_date=${encodeURIComponent(selectedDate)}`;
        }

        const records = await apiRequest(url);

        if (records.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5">No attendance records found.</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = records.map(record => `
            <tr>
                <td>${escapeHTML(record.student_name)}</td>
                <td>${escapeHTML(record.admission_number || "")}</td>
                <td>${escapeHTML(record.attendance_date)}</td>
                <td>
                    <span class="status ${
                        record.status === "Present" ? "present" : "absent"
                    }">
                        ${escapeHTML(record.status)}
                    </span>
                </td>
                <td>
                    <select
                        class="record-status"
                        data-id="${record.attendance_id}">

                        <option value="Present"
                            ${record.status === "Present" ? "selected" : ""}>
                            Present
                        </option>

                        <option value="Absent"
                            ${record.status === "Absent" ? "selected" : ""}>
                            Absent
                        </option>

                    </select>

                    <button
                        type="button"
                        class="edit-button"
                        data-action="update-attendance"
                        data-id="${record.attendance_id}">
                        Update
                    </button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Attendance records error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="5">Unable to load attendance records.</td>
            </tr>
        `;
    }
}


document.getElementById("recordDate")
    ?.addEventListener("change", function () {
        loadAttendanceRecords(this.value);
    });


document.getElementById("viewAllAttendance")
    ?.addEventListener("click", function () {
        document.getElementById("recordDate").value = "";
        loadAttendanceRecords();
    });


document.getElementById("attendanceRecordsTable")
    ?.addEventListener("click", async function (event) {
        const button = event.target.closest(
            '[data-action="update-attendance"]'
        );

        if (!button) return;

        const attendanceId = button.dataset.id;

        const statusSelect = this.querySelector(
            `.record-status[data-id="${attendanceId}"]`
        );

        try {
            const result = await apiRequest(
                `${API.attendance}/attendance/${attendanceId}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        status: statusSelect.value
                    })
                }
            );

            alert(result.message);

            await loadAttendanceRecords(
                document.getElementById("recordDate").value
            );

        } catch (error) {
            alert(error.message);
        }
    });


document.addEventListener("DOMContentLoaded", function () {

    updateAdminName();

    if (document.getElementById("totalStudents")) {
        loadDashboard();
    }

    if (document.getElementById("studentTableBody")) {
        loadStudents();
    }

    if (attendanceDateInput) {
        attendanceDateInput.value = todayDate();
    }

    if (document.getElementById("attendanceRecordsTable")) {
        loadAttendanceRecords();
    }

});
