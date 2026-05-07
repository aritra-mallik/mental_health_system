from django.urls import path
from . import views

urlpatterns = [
    path("", views.articles),          
    path("<int:index>/", views.article_detail),  
    path("view/<int:index>/", views.article_page),
    path("page/", views.all_articles_page),
]