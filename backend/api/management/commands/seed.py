import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from api.models import *


class Command(BaseCommand):
    help = "Load sample college data. Every sample user gets the password: changeme123"

    def handle(self, *args, **opts):
        if Department.objects.exists():
            self.stdout.write("Data already exists - nothing added.")
            return
        random.seed(7)
        pw = "changeme123"
        depts = {n: Department.objects.create(name=n) for n in ["CSE", "ECE"]}
        fac = {}
        for i, (name, d) in enumerate([("Dr. Ramesh Kumar", "CSE"), ("Dr. Anita Sharma", "CSE"), ("Prof. Suresh Rao", "ECE")], 1):
            u = User.objects.create_user(f"fac{i}", f"fac{i}@college.edu", pw, first_name=name, role="faculty")
            fac[i] = Faculty.objects.create(user=u, phone=f"90000000{i:02d}", department=depts[d],
                                            designation=["Professor", "Associate Professor", "Assistant Professor"][i - 1])
        names = ["Aarav", "Ananya", "Rohan", "Priya", "Karthik", "Sneha", "Vikram", "Divya", "Arjun", "Meera", "Rahul", "Isha"]
        students = []
        for i, n in enumerate(names):
            d = "CSE" if i < 8 else "ECE"
            u = User.objects.create_user(f"s{101 + i}", f"s{101 + i}@college.edu", pw, first_name=n, role="student")
            students.append(Student.objects.create(user=u, roll_number=f"22{d}{101 + i}", phone=f"98000000{i:02d}",
                                                   department=depts[d], year=3, section="A" if i % 2 == 0 else "B"))
        rows = [("Machine Learning", "CS601", "CSE", 1), ("Computer Networks", "CS602", "CSE", 2),
                ("Database Systems", "CS603", "CSE", 1), ("Digital Signal Processing", "EC601", "ECE", 3)]
        for name, code, d, f in rows:
            s = Subject.objects.create(name=name, code=code, department=depts[d], faculty=fac[f])
            mates = [x for x in students if x.department == s.department]
            for k in range(14):
                for st in mates:
                    # a couple of students are deliberately low so the "low attendance" watch-list has data
                    rate = 0.55 if st.roll_number.endswith(("103", "109")) else 0.88
                    Attendance.objects.create(subject=s, student=st, date=date.today() - timedelta(days=k),
                                              present=random.random() < rate)
            for st in mates:
                for exam in ("Mid 1", "Mid 2"):
                    Marks.objects.create(subject=s, student=st, exam=exam, score=random.randint(24, 48), max_score=50)
            a = Assignment.objects.create(subject=s, title=f"{name} - Assignment 1",
                                          description="Solve the problems given in class and submit your answers.",
                                          due_date=date.today() + timedelta(days=7))
            for j, st in enumerate(mates[:4]):
                Submission.objects.create(assignment=a, student=st, answer="Submitted answer text",
                                          grade=random.randint(7, 10) if j < 2 else None)
        for t, b, a in [("Mid-semester exams begin next week", "Timetable is on the notice board. Carry your ID cards.", "all"),
                        ("Attendance below 75% will be flagged", "Students under 75% will receive a warning from the admin office.", "student"),
                        ("Internal marks submission deadline", "Faculty must finalise internal marks by Friday.", "faculty")]:
            Notice.objects.create(title=t, body=b, audience=a)
        self.stdout.write(self.style.SUCCESS("Sample data loaded. Logins: fac1-fac3 and s101-s112, password changeme123"))
