from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# load once (global)
_analyzer = SentimentIntensityAnalyzer()

def analyze_text(text: str):
    """
    Returns:
    {
        label: POSITIVE | NEGATIVE,
        score: float,
        mood: your system mood
    }
    """

    scores = _analyzer.polarity_scores(text)

    compound = scores["compound"]  # -1 to +1
    text_l = text.lower()

    # --- map to your mood system ---
    if compound >= 0.6:
        mood = "excellent"
    elif compound >= 0.2:
        mood = "happy"

    elif compound <= -0.6:
        mood = "sad"
    elif compound <= -0.2:
        if any(w in text_l for w in ["anxious", "worried", "nervous"]):
            mood = "anxious"
        elif any(w in text_l for w in ["angry", "frustrated", "mad"]):
            mood = "angry"
        else:
            mood = "sad"
    else:
        mood = "neutral"

    return {
        "label": "POSITIVE" if compound >= 0 else "NEGATIVE",
        "score": abs(compound),
        "mood": mood
    }