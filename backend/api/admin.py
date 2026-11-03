from django.contrib import admin
from . import models
for m in (models.User, models.Department, models.Student, models.Faculty, models.Subject,
          models.Attendance, models.Marks, models.Assignment, models.Submission):
    admin.site.register(m)
admin.site.register(models.Notice)
