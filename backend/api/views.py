from datetime import date as _date, timedelta
from django.db import transaction
from django.db.models import Count, Q, Sum
from rest_framework import permissions as P, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import *
from .serializers import *


class RoleWrite(P.BasePermission):
    """Any logged-in user may read; writes need a role listed in view.write_roles."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.method in P.SAFE_METHODS or request.user.role in view.write_roles


class Base(viewsets.ModelViewSet):
    permission_classes = [RoleWrite]
    write_roles = ("admin",)

    def filt(self, qs, *names):
        for n in names:
            v = self.request.query_params.get(n)
            if v:
                qs = qs.filter(**{n: v})
        return qs


class Own(Base):
    def own(self, qs):  # students only ever see their own rows
        u = self.request.user
        return qs.filter(student__user=u) if u.role == "student" else qs


def pct(p, t):
    return round(100 * p / t, 1) if t else None


class PersonActions:
    """Admin-only helpers shared by the student and faculty endpoints."""
    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        if request.user.role != "admin":
            raise PermissionDenied("Admin only")
        pw = request.data.get("password") or "changeme123"
        if len(pw) < 6:
            return Response({"detail": "Password must be at least 6 characters"}, status=400)
        obj = self.get_object()
        obj.user.set_password(pw)
        obj.user.save()
        return Response({"detail": "Password updated", "password": pw})

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        if request.user.role != "admin":
            raise PermissionDenied("Admin only")
        obj = self.get_object()
        obj.user.is_active = not obj.user.is_active
        obj.user.save()
        return Response({"is_active": obj.user.is_active})


class DepartmentViewSet(Base):
    serializer_class = DepartmentSerializer
    search_fields = ["name"]

    def get_queryset(self):
        return Department.objects.annotate(
            student_count=Count("student", distinct=True), faculty_count=Count("faculty", distinct=True),
            subject_count=Count("subject", distinct=True))


class StudentViewSet(PersonActions, Base):
    serializer_class = StudentSerializer
    search_fields = ["user__first_name", "user__username", "roll_number"]

    def get_queryset(self):
        qs = Student.objects.select_related("user", "department").annotate(
            att_total=Count("attendance", distinct=True),
            att_present=Count("attendance", filter=Q(attendance__present=True), distinct=True))
        if self.request.user.role == "student":
            qs = qs.filter(user=self.request.user)
        qs = self.filt(qs, "department", "year", "section")
        st = self.request.query_params.get("status")
        if st in ("active", "inactive"):
            qs = qs.filter(user__is_active=(st == "active"))
        return qs.order_by("roll_number")

    @action(detail=True)
    def report(self, request, pk=None):
        """Full picture for one student: per-subject attendance and every mark."""
        st = self.get_object()
        rows = (Attendance.objects.filter(student=st).values("subject__id", "subject__name")
                .annotate(total=Count("id"), present=Count("id", filter=Q(present=True))))
        subjects = [{"subject": r["subject__name"], "total": r["total"], "present": r["present"],
                     "percent": pct(r["present"], r["total"])} for r in rows]
        t, p = sum(r["total"] for r in subjects), sum(r["present"] for r in subjects)
        marks = Marks.objects.filter(student=st).select_related("subject")
        return Response({
            "student": StudentSerializer(st).data, "subjects": subjects, "overall": pct(p, t),
            "marks": [{"id": m.id, "subject": m.subject.name, "exam": m.exam, "score": m.score, "max_score": m.max_score}
                      for m in marks],
            "recent": [{"id": a.id, "date": a.date, "subject": a.subject.name, "present": a.present}
                       for a in Attendance.objects.filter(student=st).select_related("subject").order_by("-date")[:10]]})


class FacultyViewSet(PersonActions, Base):
    serializer_class = FacultySerializer
    search_fields = ["user__first_name", "user__username"]

    def get_queryset(self):
        qs = Faculty.objects.select_related("user", "department").prefetch_related("subject_set").annotate(
            subject_count=Count("subject", distinct=True))
        st = self.request.query_params.get("status")
        if st in ("active", "inactive"):
            qs = qs.filter(user__is_active=(st == "active"))
        return self.filt(qs, "department").order_by("user__first_name")


class SubjectViewSet(Base):
    serializer_class = SubjectSerializer
    search_fields = ["name", "code"]

    def get_queryset(self):
        qs = Subject.objects.select_related("department", "faculty__user").annotate(
            student_count=Count("department__student", distinct=True))
        if self.request.user.role == "faculty":
            qs = qs.filter(faculty__user=self.request.user)
        return self.filt(qs, "department")


def check_subject(user, subject):
    """Faculty may only write for subjects assigned to them; admins for any."""
    if user.role == "faculty" and (subject.faculty is None or subject.faculty.user_id != user.id):
        raise PermissionDenied("This subject is not assigned to you")


class AttendanceViewSet(Own):
    write_roles = ("admin", "faculty")
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        qs = Attendance.objects.select_related("student__user", "subject", "updated_by")
        if self.request.user.role == "faculty":
            qs = qs.filter(subject__faculty__user=self.request.user)
        qs = self.filt(self.own(qs), "subject", "date", "student", "present")
        p = self.request.query_params
        if p.get("date_from"):
            qs = qs.filter(date__gte=p["date_from"])
        if p.get("date_to"):
            qs = qs.filter(date__lte=p["date_to"])
        return qs.order_by("-date", "student__roll_number")

    def perform_create(self, s):
        check_subject(self.request.user, s.validated_data["subject"])
        s.save(updated_by=self.request.user)

    def perform_update(self, s):
        check_subject(self.request.user, s.instance.subject)
        s.save(updated_by=self.request.user)

    def perform_destroy(self, inst):
        check_subject(self.request.user, inst.subject)
        inst.delete()

    @action(detail=False)
    def sheet(self, request):
        """Roster for one subject + date, pre-filled with whatever is already saved."""
        sid, day = request.query_params.get("subject"), request.query_params.get("date")
        if not (sid and day):
            return Response({"detail": "subject and date are required"}, status=400)
        sub = Subject.objects.select_related("faculty").get(pk=sid)
        check_subject(request.user, sub)
        saved = {a.student_id: a for a in Attendance.objects.filter(subject=sub, date=day)}
        studs = Student.objects.filter(department=sub.department, user__is_active=True).select_related("user").order_by("roll_number")
        return Response({"marked": bool(saved), "students": [
            {"student": s.id, "roll": s.roll_number, "name": s.user.first_name, "year": s.year, "section": s.section,
             "present": saved[s.id].present if s.id in saved else None,
             "remark": saved[s.id].remark if s.id in saved else "",
             "updated_by": saved[s.id].updated_by.username if s.id in saved and saved[s.id].updated_by else None}
            for s in studs]})

    @action(detail=False, methods=["post"])
    def bulk(self, request):
        d = request.data
        if not (d.get("subject") and d.get("date") and isinstance(d.get("records"), list)):
            return Response({"detail": "subject, date and records are required"}, status=400)
        sub = Subject.objects.select_related("faculty").get(pk=d["subject"])
        check_subject(request.user, sub)
        with transaction.atomic():
            for r in d["records"]:
                Attendance.objects.update_or_create(
                    subject=sub, student_id=r["student"], date=d["date"],
                    defaults={"present": bool(r["present"]), "remark": r.get("remark", "")[:120],
                              "updated_by": request.user})
        return Response({"saved": len(d["records"])})

    @action(detail=False)
    def summary(self, request):
        qs = self.get_queryset().order_by().values("subject__name").annotate(
            total=Count("id"), present=Count("id", filter=Q(present=True)))
        rows = [{"subject": r["subject__name"], "total": r["total"], "present": r["present"],
                 "percent": pct(r["present"], r["total"])} for r in qs]
        t, p = sum(r["total"] for r in rows), sum(r["present"] for r in rows)
        return Response({"subjects": rows, "overall": pct(p, t) or 0})

    @action(detail=False)
    def low(self, request):
        """Students whose attendance is under the threshold (default 75%)."""
        if request.user.role == "student":
            raise PermissionDenied("Not allowed")
        th = float(request.query_params.get("threshold", 75))
        qs = self.get_queryset().order_by().values(
            "student__id", "student__roll_number", "student__user__first_name", "student__department__name"
        ).annotate(total=Count("id"), present=Count("id", filter=Q(present=True)))
        out = [{"student": r["student__id"], "roll": r["student__roll_number"], "name": r["student__user__first_name"],
                "department": r["student__department__name"], "total": r["total"], "present": r["present"],
                "percent": pct(r["present"], r["total"])} for r in qs]
        return Response(sorted([o for o in out if o["percent"] is not None and o["percent"] < th], key=lambda o: o["percent"]))


class MarksViewSet(Own):
    write_roles = ("admin", "faculty")
    serializer_class = MarksSerializer

    def get_queryset(self):
        qs = Marks.objects.select_related("student__user", "subject")
        if self.request.user.role == "faculty":
            qs = qs.filter(subject__faculty__user=self.request.user)
        return self.filt(self.own(qs), "subject", "student")

    def perform_create(self, s):
        check_subject(self.request.user, s.validated_data["subject"])
        s.save()

    def perform_update(self, s):
        check_subject(self.request.user, s.instance.subject)
        s.save()

    def perform_destroy(self, inst):
        check_subject(self.request.user, inst.subject)
        inst.delete()


class AssignmentViewSet(Base):
    write_roles = ("admin", "faculty")
    serializer_class = AssignmentSerializer

    def get_queryset(self):
        u = self.request.user
        qs = Assignment.objects.select_related("subject")
        if u.role == "student":
            qs = qs.filter(subject__department=u.student.department)
        elif u.role == "faculty":
            qs = qs.filter(subject__faculty__user=u)
        return qs


class SubmissionViewSet(Own):
    write_roles = ("student", "faculty", "admin")
    serializer_class = SubmissionSerializer

    def get_queryset(self):
        qs = self.own(Submission.objects.select_related("student", "assignment"))
        if self.request.user.role == "faculty":
            qs = qs.filter(assignment__subject__faculty__user=self.request.user)
        return qs

    def perform_create(self, s):
        if self.request.user.role != "student":
            raise PermissionDenied("Only students submit")
        obj, _ = Submission.objects.update_or_create(
            assignment=s.validated_data["assignment"], student=self.request.user.student,
            defaults={"answer": s.validated_data.get("answer", ""), "grade": None})
        s.instance = obj

    def perform_update(self, s):
        if self.request.user.role == "student":
            raise PermissionDenied("Only faculty can grade")
        s.save()


@api_view(["GET"])
def profile(request):
    u = request.user
    return Response({"username": u.username, "name": u.first_name, "email": u.email, "role": u.role})


@api_view(["GET"])
def dashboard(request, role):
    u = request.user
    if role != u.role:
        return Response({"detail": "Forbidden"}, status=403)
    if role == "admin":
        a = Attendance.objects.all()
        m = Marks.objects.aggregate(a=Sum("score"), b=Sum("max_score"))
        return Response({
            "Students": Student.objects.count(), "Faculty": Faculty.objects.count(),
            "Subjects": Subject.objects.count(), "Departments": Department.objects.count(),
            "Overall Attendance %": round(100 * a.filter(present=True).count() / a.count(), 1) if a.count() else 0,
            "Average Marks %": round(100 * m["a"] / m["b"], 1) if m["b"] else 0,
            "Assignments": Assignment.objects.count(), "Submissions": Submission.objects.count()})
    if role == "faculty":
        subs = Subject.objects.filter(faculty__user=u)
        return Response({
            "My Subjects": subs.count(),
            "Total Students": Student.objects.filter(department__subject__in=subs).distinct().count(),
            "Pending Grading": Submission.objects.filter(assignment__subject__in=subs, grade__isnull=True).count()})
    s = u.student
    att = Attendance.objects.filter(student=s)
    m = Marks.objects.filter(student=s).aggregate(a=Sum("score"), b=Sum("max_score"))
    return Response({
        "Attendance %": round(100 * att.filter(present=True).count() / att.count(), 1) if att.count() else 0,
        "Average Marks %": round(100 * m["a"] / m["b"], 1) if m["b"] else 0,
        "Assignments Submitted": f"{Submission.objects.filter(student=s).count()}/"
                                 f"{Assignment.objects.filter(subject__department=s.department).count()}"})



class NoticeViewSet(Base):
    serializer_class = NoticeSerializer
    search_fields = ["title", "body"]

    def get_queryset(self):
        qs = Notice.objects.select_related("created_by")
        u = self.request.user
        return qs if u.role == "admin" else qs.filter(audience__in=["all", u.role])

    def perform_create(self, s):
        s.save(created_by=self.request.user)


@api_view(["GET"])
def analytics(request):
    """Charts + watch-lists for the admin dashboard."""
    if request.user.role != "admin":
        return Response({"detail": "Forbidden"}, status=403)
    depts = [{"name": d.name, "students": d.s, "faculty": d.f, "subjects": d.sub}
             for d in Department.objects.annotate(s=Count("student", distinct=True), f=Count("faculty", distinct=True),
                                                  sub=Count("subject", distinct=True))]
    today, trend = _date.today(), []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        a = Attendance.objects.filter(date=day)
        t = a.count()
        trend.append({"date": day.isoformat(), "percent": pct(a.filter(present=True).count(), t), "total": t})
    subj = (Attendance.objects.values("subject__name").annotate(t=Count("id"), p=Count("id", filter=Q(present=True))))
    by_subject = [{"subject": r["subject__name"], "percent": pct(r["p"], r["t"])} for r in subj]
    low = (Attendance.objects.values("student__id", "student__roll_number", "student__user__first_name")
           .annotate(t=Count("id"), p=Count("id", filter=Q(present=True))))
    low = sorted([{"student": r["student__id"], "roll": r["student__roll_number"], "name": r["student__user__first_name"],
                   "percent": pct(r["p"], r["t"])} for r in low if r["t"] and 100 * r["p"] / r["t"] < 75],
                 key=lambda o: o["percent"])[:8]
    workload = [{"name": f.user.first_name, "subjects": f.n}
                for f in Faculty.objects.select_related("user").annotate(n=Count("subject")).order_by("-n")[:6]]
    return Response({
        "departments": depts, "trend": trend, "by_subject": by_subject, "low_attendance": low, "workload": workload,
        "unassigned_subjects": Subject.objects.filter(faculty__isnull=True).count(),
        "inactive": {"students": Student.objects.filter(user__is_active=False).count(),
                     "faculty": Faculty.objects.filter(user__is_active=False).count()},
        "notices": NoticeSerializer(Notice.objects.all()[:4], many=True).data})
