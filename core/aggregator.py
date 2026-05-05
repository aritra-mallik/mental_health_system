from datetime import timedelta
from django.utils import timezone
from .models import MentalSignal


RISK_SCORE = {
    "low": 1,
    "moderate": 2,
    "high": 3
}

MOOD_SCORE = {
    "excellent": 2,
    "happy": 1,
    "neutral": 0,
    "anxious": -1,
    "sad": -2,
    "angry": -1.5
}

SOURCE_WEIGHT = {
    "assessment": 1.0,
    "journal": 0.8,
    "chat": 0.6,
    "mood": 0.5
}


def compute_state(user):
    now = timezone.now()
    window = now - timedelta(days=3)

    signals = MentalSignal.objects.filter(
        user=user,
        created_at__gte=window
    )

    if not signals.exists():
        return {
            "overall_mood": "neutral",
            "overall_risk": "low",
            "score": 0
        }

    total_risk = 0
    total_mood = 0
    total_weight = 0

    for s in signals:
        base_weight = SOURCE_WEIGHT.get(s.source, 0.5)

        # recency decay
        age_hours = (now - s.created_at).total_seconds() / 3600
        time_weight = max(0.3, 1 - (age_hours / 72))  # decay over 3 days

        weight = base_weight * time_weight

        total_weight += weight

        total_risk += RISK_SCORE.get(s.risk, 1) * weight
        total_mood += MOOD_SCORE.get(s.mood, 0) * weight

    avg_risk = total_risk / total_weight
    avg_mood = total_mood / total_weight

    # classify risk
    if avg_risk >= 2.5:
        overall_risk = "high"
    elif avg_risk >= 1.5:
        overall_risk = "moderate"
    else:
        overall_risk = "low"

    # classify mood
    if avg_mood >= 1:
        overall_mood = "happy"
    elif avg_mood >= 0:
        overall_mood = "neutral"
    elif avg_mood >= -1.5:
        overall_mood = "anxious"
    else:
        overall_mood = "sad"

    return {
        "overall_mood": overall_mood,
        "overall_risk": overall_risk,
        "score": round(avg_mood, 2)
    }