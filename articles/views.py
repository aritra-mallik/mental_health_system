from django.conf import settings
import os, random
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import ArticleSerializer
from django.shortcuts import render
from core.aggregator import compute_state

# HTML PAGE VIEW (for browser only)
def article_page(request, index):
    return render(request, "articles/article_detail.html", {
        "index": index
    })


def load_articles():
    file_path = os.path.join(settings.BASE_DIR, 'articles', 'summary.txt')
    articles = []

    with open(file_path, 'r', encoding='utf-8') as f:
        blocks = f.read().strip().split("\n\n")

    for i, block in enumerate(blocks):   
        lines = block.strip().split("\n")

        if len(lines) < 7:
            continue

        articles.append({
            "id": i,   
            "title": lines[0],
            "mood": lines[1].lower(),
            "read_time": lines[2],
            "author": lines[3],
            "date": lines[4],
            "link": lines[5],
            "full": " ".join(lines[6:]),
            "short": " ".join(lines[6:])[:80] + "..."
        })

    return articles




@api_view(["GET"])
def articles(request):

    data = load_articles()

    # ---------------------------------
    # GUEST USER FALLBACK
    # ---------------------------------
    if not request.user.is_authenticated:
        random.shuffle(data)
        return Response(data[:100])

    # ---------------------------------
    # COMPUTE USER STATE
    # ---------------------------------
    state = compute_state(
        request.user,
        days=2
    )

    mood = (
        state.get("overall_mood")
        or "neutral"
    ).lower().strip()

    
    # ---------------------------------
    # EMOTIONAL DIVERSITY MIX
    # ---------------------------------

    ALL_MOODS = [
        "great",
        "good",
        "neutral",
        "stressed",
        "low",
        "overwhelmed"
    ]

    # everything except primary mood
    mixed_pool = [
        m for m in ALL_MOODS
        if m != mood
    ]

    # ---------------------------------
    # PRIMARY ARTICLES (75%)
    # ---------------------------------
    matched = [
        a for a in data
        if a["mood"].strip().lower() == mood
    ]

    # ---------------------------------
    # MIXED ARTICLES (25%)
    # ---------------------------------
    mixed = [
        a for a in data
        if a["mood"].strip().lower() in mixed_pool
    ]

    # ---------------------------------
    # SHUFFLE
    # ---------------------------------
    random.shuffle(matched)
    random.shuffle(mixed)

    # ---------------------------------
    # BUILD FINAL FEED
    # ---------------------------------
    TOTAL = 25

    matched_count = int(TOTAL * 0.75)
    mixed_count = TOTAL - matched_count

    final_feed = (
        matched[:matched_count] +
        mixed[:mixed_count]
    )

    random.shuffle(final_feed)

    return Response(final_feed)

@api_view(["GET"])
def article_detail(request, index):
    data = load_articles()

    if index >= len(data):
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(data[index])

def all_articles_page(request):
    return render(request, "articles/all_articles.html")

def about_page(request):
    return render(request, "includes/about.html")
