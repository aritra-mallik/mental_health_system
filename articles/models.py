from django.db import models

class Article(models.Model):

    MOOD_CHOICES = [
        ("great","Great"),
        ("good","Good"),
        ("neutral","Neutral"),
        ("stressed","Stressed"),
        ("low","Low"),
        ("overwhelmed","Overwhelmed")
    ]

    title = models.CharField(max_length=300)
    mood = models.CharField(
        max_length=20,
        choices=MOOD_CHOICES
    )

    read_time = models.CharField(max_length=50)

    author = models.CharField(max_length=100)

    date = models.DateField()

    link = models.URLField()

    video_link = models.URLField()

    music_link = models.URLField()

    content = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.title