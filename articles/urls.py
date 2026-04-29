from django.urls import path
from . import views

urlpatterns = [
    path("", views.articles),          # list
    path("<int:index>/", views.article_detail),  # detail
    path("view/<int:index>/", views.article_page),
]