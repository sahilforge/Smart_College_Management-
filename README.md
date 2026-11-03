# Smart College Management System v4 (React + Django REST + JWT)

Folder layout (extract the whole zip first):
  college/
    backend/   manage.py, requirements.txt, college/ (settings), api/ (app)
    frontend/  package.json, index.html, src/ (App.jsx, ui.jsx, pages/*, styles.css)

## Backend (cmd, Python 3.10+)
cd backend
python -m venv venv
venv\Scripts\activate
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
python manage.py makemigrations api
python manage.py migrate
python manage.py createsuperuser
python manage.py seed            (optional: sample departments, faculty, students, attendance, notices)
python manage.py runserver
-> API at http://localhost:8000/api/   (admin site: /admin/)

UPGRADING FROM v3? The database schema changed (new fields + a Notice table).
Delete backend/db.sqlite3 and backend/api/migrations/, then run makemigrations api,
migrate, createsuperuser (and seed) again.

## Frontend (second cmd window, Node.js 18+)
cd frontend
npm install
npm run dev
-> open http://localhost:5173 and log in with the superuser (admin role)

## What's new in v4

Admin
- Dashboard: 14-day attendance trend, department / subject / workload charts, low-attendance
  watch-list, "needs attention" alerts (unassigned subjects, inactive accounts), latest notices,
  quick actions.
- Students: search + filter by department / year / section / status, live attendance % per student,
  add / edit in a pop-up form, activate / deactivate (blocks login without deleting data),
  reset password, bulk activate / deactivate / delete, CSV export, and a student profile drawer
  (attendance by subject, recent attendance you can correct on the spot, marks).
- Faculty: designation, assigned-subject chips, "assign subjects" picker, activate / deactivate,
  reset password, CSV export.
- Departments and Subjects: counts per department, "Unassigned" subject warning, safer delete messages.
- Notices: publish announcements for everyone, faculty only, or students only.

Attendance (admin AND faculty)
- Mark / Edit: pick subject + date (with previous / next day arrows). If the day is already saved
  you are editing it. Present / Absent toggle, optional remark, All present / All absent, live %.
- Records: filter by subject, date range, status, student; click a status to flip it, edit the
  remark, delete, export CSV.
- Overview (per subject) and Low attendance list (choose your own threshold, export).
- Every record remembers who last edited it. Faculty can only touch their own subjects (enforced by the API).

Everyone
- Responsive layout (mobile menu), dark mode toggle, toasts and confirm dialogs.

## First use
Admin: add Department -> Faculty -> Students -> Subjects (assign faculty).
Faculty: mark attendance, enter marks, post assignments, grade submissions.
Student: view attendance, marks, assignments and submit answers.
New students/faculty get the password changeme123 if left blank.
Seed logins: fac1-fac3 and s101-s112, password changeme123.

## Optional
- MySQL: pip install mysqlclient (or pymysql), create database `college`, then
  set USE_MYSQL=1 DB_NAME=college DB_USER=root DB_PASSWORD=... before migrate.
- Always run makemigrations api BEFORE the first migrate.
- The frontend talks to http://localhost:8000/api by default; override with VITE_API.
