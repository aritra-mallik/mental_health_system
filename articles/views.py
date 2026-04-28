from django.conf import settings
import os
from django.http import JsonResponse
from django.shortcuts import render


def load_articles():
    file_path = os.path.join(settings.BASE_DIR, 'articles', 'summary.txt')
    articles = []

    with open(file_path, 'r', encoding='utf-8') as f:
        blocks = f.read().strip().split("\n\n")

    for block in blocks:
        lines = block.strip().split("\n")

        if len(lines) < 5:
            continue

        title = lines[0]
        mood = lines[1].lower()
        read_time = lines[2]
        link = lines[3]
        summary = " ".join(lines[4:])

        short = summary[:80] + "..."

        articles.append({
            "title": title,
            "short": short,
            "full": summary,
            "link": link,
            "mood": mood,
            "read_time": read_time
        })

    return articles


# 🔥 API for dashboard
def articles_api(request):
    user_mood = request.GET.get("mood")  # from frontend
    articles = load_articles()

    if user_mood:
        articles = [a for a in articles if a["mood"] == user_mood]

    return JsonResponse(articles, safe=False)


# 📄 Detail page
def article_detail(request, index):
    articles = load_articles()

    if index >= len(articles):
        return render(request, "articles/article_detail.html", {
            "article": None
        })

    article = articles[index]
    return render(request, "articles/article_detail.html", {"article": article})