#core/aggregator.py
from datetime import timedelta
from django.utils import timezone
from .models import MentalSignal
from collections import Counter

RISK_SCORE = {
    "less": 1,
    "moderate": 2,
    "high": 3
}

MOOD_SCORE = {
    "great": 2,
    "good": 1,
    "neutral": 0,
    "stressed": -1,
    "low": -2,
    "overwhelmed": -3 
}

SOURCE_WEIGHT = {
    # conversational emotional state
    "chat": 1.3,

    # reflective emotional processing
    "journal": 0.9,

    # slower long-term stability
    "assessment": 0.7,
}


def compute_state(user,reference_time=None,days=1,mode="realtime"):
    now = reference_time or timezone.now()
    window = now - timedelta(days=days)

    signals = MentalSignal.objects.filter(
        user=user,
        created_at__gte=window,
        created_at__lte=now
    ).order_by("created_at")

    if not signals.exists():
        return {
            "overall_mood": None,
            "overall_risk": None,
            "score": None
        }

    total_risk = 0
    total_mood = 0
    total_weight = 0
    mood_counter = Counter(
        s.mood for s in signals
    )
    for s in signals:
        base_weight = SOURCE_WEIGHT.get(s.source, 0.5)

        # ---------------------------------
        # REALTIME MODE
        # (current behavior preserved)
        # ---------------------------------
        if mode == "realtime":

            age_hours = (
                now - s.created_at
            ).total_seconds() / 3600

            time_weight = max(
                0.15,
                1 - (age_hours / 6)
            )

            weight = base_weight * time_weight

        # ---------------------------------
        # HISTORICAL MODE
        # (temporary identical behavior)
        # ---------------------------------
        elif mode == "historical":

            # Historical mode:
            # equal source weighting
            # + emotional frequency awareness

            historical_weights = {
                "chat": 1.0,
                "journal": 1.0,
                "assessment": 1.0,
            }

            weight = historical_weights.get(
                s.source,
                1.0
            )

            # frequency amplification
            # repeated moods gain slightly
            # more influence historically

            frequency_multiplier = 1 + (
                (mood_counter[s.mood] - 1) * 0.08
            )

            weight *= frequency_multiplier
        # ---------------------------------
        # FALLBACK
        # ---------------------------------
        else:

            weight = base_weight

        total_weight += weight

        total_risk += RISK_SCORE.get(s.risk, 1) * weight
        total_mood += MOOD_SCORE.get(s.mood, 0) * weight

    if total_weight == 0:
        return {
            "overall_mood": "neutral",
            "overall_risk": "less",
            "score": 0
        }

    avg_risk = total_risk / total_weight
    avg_mood = total_mood / total_weight

    # classify risk
    if avg_risk >= 2.5:
        overall_risk = "high"
    elif avg_risk >= 1.5:
        overall_risk = "moderate"
    else:
        overall_risk = "less"

    # classify mood
    if avg_mood >= 1.5:          # 1.5 to 2.0+
        overall_mood = "great"
    elif avg_mood >= 0.5:        # 0.5 to 1.49
        overall_mood = "good"
    elif avg_mood >= -0.5:       # -0.5 to 0.49
        overall_mood = "neutral"
    elif avg_mood >= -1.5:       # -1.5 to -0.51
        overall_mood = "stressed"
    elif avg_mood >= -2.5:       # -2.5 to -1.51
        overall_mood = "low"
    else:                        # < -2.5
        overall_mood = "overwhelmed"

    return {
        "overall_mood": overall_mood,
        "overall_risk": overall_risk,
        "score": round(avg_mood, 2)
    }