import random
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import render
from .models import Article
from .serializers import ArticleSerializer
from core.aggregator import compute_state

@api_view(["GET"])
def articles(request):
    # 1. Fetch from Database
    queryset = Article.objects.all()

    # 2. Guest Fallback
    if not request.user.is_authenticated:
        data = ArticleSerializer(queryset, many=True).data
        random.shuffle(data)
        return Response(data[:100])

    # 3. User State Compute
    state = compute_state(request.user, days=0.5)
    mood = (state.get("overall_mood") or "neutral").lower().strip()

    # 4. Filter and Shuffle
    ALL_MOODS = ["great", "good", "neutral", "stressed", "low", "overwhelmed"]
    mixed_pool = [m for m in ALL_MOODS if m != mood]

    # Use ORM filters directly
    matched = list(queryset.filter(mood=mood))
    mixed = list(queryset.filter(mood__in=mixed_pool))

    random.shuffle(matched)
    random.shuffle(mixed)

    # 5. Build Feed (75% Matched / 25% Mixed)
    TOTAL = 25
    matched_count = int(TOTAL * 0.75)
    mixed_count = TOTAL - matched_count
    final_feed = matched[:matched_count] + mixed[:mixed_count]
    random.shuffle(final_feed)

    return Response(ArticleSerializer(final_feed, many=True).data)

@api_view(["GET"])
def article_detail(request, index):
    try:
        # Straight DB Lookup: 100% reliable
        article = Article.objects.get(id=index)
        return Response(ArticleSerializer(article).data)
    except Article.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

# HTML Page Views
def article_page(request, index): return render(request, "articles/article_detail.html", {"index": index})
def all_articles_page(request): return render(request, "articles/all_articles.html")

def about_page(request):
    return render(request, "includes/about.html")
