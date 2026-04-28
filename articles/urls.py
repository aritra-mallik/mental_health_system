from django.urls import path
from . import views

urlpatterns = [
    path("", views.articles_api),
    path("view/<int:index>/", views.article_detail, name="article_detail"),
]