from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import *


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data.update(role=self.user.role, username=self.user.username)
        return data


class PersonSerializer(serializers.ModelSerializer):
    ROLE = ""
    username = serializers.CharField(source="user.username")
    first_name = serializers.CharField(source="user.first_name")
    email = serializers.EmailField(source="user.email", required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    is_active = serializers.BooleanField(source="user.is_active", required=False)
    department_name = serializers.CharField(source="department.name", read_only=True)

    @transaction.atomic
    def create(self, v):
        u = v.pop("user", {})
        pw = v.pop("password", None) or "changeme123"
        user = User.objects.create_user(password=pw, role=self.ROLE, **u)
        return self.Meta.model.objects.create(user=user, **v)

    @transaction.atomic
    def update(self, inst, v):
        u = v.pop("user", {})
        pw = v.pop("password", None)
        for k, val in u.items():
            setattr(inst.user, k, val)
        if pw:
            inst.user.set_password(pw)
        inst.user.save()
        return super().update(inst, v)


class StudentSerializer(PersonSerializer):
    ROLE = "student"
    attendance_percent = serializers.SerializerMethodField()

    def get_attendance_percent(self, o):
        t = getattr(o, "att_total", None)
        if t is None:
            t = o.attendance_set.count()
            p = o.attendance_set.filter(present=True).count()
        else:
            p = o.att_present
        return round(100 * p / t, 1) if t else None

    class Meta:
        model = Student
        fields = ["id", "username", "first_name", "email", "password", "roll_number", "phone",
                  "department", "department_name", "year", "section", "is_active", "attendance_percent"]


class FacultySerializer(PersonSerializer):
    ROLE = "faculty"
    subject_count = serializers.IntegerField(read_only=True)
    subjects = serializers.SerializerMethodField()

    def get_subjects(self, o):
        return [{"id": s.id, "name": s.name, "code": s.code} for s in o.subject_set.all()]

    class Meta:
        model = Faculty
        fields = ["id", "username", "first_name", "email", "password", "phone", "designation",
                  "department", "department_name", "is_active", "subject_count", "subjects"]


class DepartmentSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(read_only=True)
    faculty_count = serializers.IntegerField(read_only=True)
    subject_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Department
        fields = ["id", "name", "student_count", "faculty_count", "subject_count"]


class SubjectSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    faculty_name = serializers.CharField(source="faculty.user.first_name", read_only=True)
    student_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Subject
        fields = "__all__"


class AttendanceSerializer(serializers.ModelSerializer):
    student_roll = serializers.CharField(source="student.roll_number", read_only=True)
    student_name = serializers.CharField(source="student.user.first_name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.username", read_only=True)
    class Meta:
        model = Attendance
        fields = "__all__"
        read_only_fields = ["updated_by", "updated_at"]


class MarksSerializer(serializers.ModelSerializer):
    student_roll = serializers.CharField(source="student.roll_number", read_only=True)
    student_name = serializers.CharField(source="student.user.first_name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    class Meta:
        model = Marks
        fields = "__all__"


class AssignmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    class Meta:
        model = Assignment
        fields = "__all__"


class SubmissionSerializer(serializers.ModelSerializer):
    student_roll = serializers.CharField(source="student.roll_number", read_only=True)
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)
    class Meta:
        model = Submission
        fields = "__all__"
        read_only_fields = ["student"]


class NoticeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    class Meta:
        model = Notice
        fields = "__all__"
        read_only_fields = ["created_by", "created_at"]
