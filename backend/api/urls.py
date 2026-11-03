from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views as v
from .serializers import LoginSerializer

router = DefaultRouter()
for prefix, vs in [("students", v.StudentViewSet), ("faculty", v.FacultyViewSet),
                   ("subjects", v.SubjectViewSet), ("departments", v.DepartmentViewSet),
                   ("attendance", v.AttendanceViewSet), ("marks", v.MarksViewSet),
                   ("assignments", v.AssignmentViewSet), ("submissions", v.SubmissionViewSet),
                   ("notices", v.NoticeViewSet)]:
    router.register(prefix, vs, basename=prefix)

urlpatterns = [
    path("auth/login/", TokenObtainPairView.as_view(serializer_class=LoginSerializer)),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/profile/", v.profile),
    path("dashboard/<str:role>/", v.dashboard),
    path("analytics/", v.analytics),
] + router.urls
