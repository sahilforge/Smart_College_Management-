from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLES = [("admin", "Admin"), ("faculty", "Faculty"), ("student", "Student")]
    role = models.CharField(max_length=10, choices=ROLES, default="student")

    def save(self, *a, **k):
        if self.is_superuser:
            self.role = "admin"
        super().save(*a, **k)


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.name


class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    roll_number = models.CharField(max_length=30, unique=True)
    phone = models.CharField(max_length=15, blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    year = models.PositiveSmallIntegerField(default=1)
    section = models.CharField(max_length=5, blank=True)


class Faculty(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=15, blank=True)
    designation = models.CharField(max_length=60, blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)


class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    faculty = models.ForeignKey(Faculty, on_delete=models.SET_NULL, null=True, blank=True)


class Attendance(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    date = models.DateField()
    present = models.BooleanField(default=True)
    remark = models.CharField(max_length=120, blank=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ("subject", "student", "date")


class Marks(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    exam = models.CharField(max_length=50)
    score = models.FloatField()
    max_score = models.FloatField(default=100)


class Assignment(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    due_date = models.DateField()


class Submission(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    answer = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now=True)
    grade = models.FloatField(null=True, blank=True)


class Notice(models.Model):
    AUDIENCE = [("all", "Everyone"), ("faculty", "Faculty"), ("student", "Students")]
    title = models.CharField(max_length=150)
    body = models.TextField(blank=True)
    audience = models.CharField(max_length=10, choices=AUDIENCE, default="all")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    class Meta:
        ordering = ["-created_at"]
