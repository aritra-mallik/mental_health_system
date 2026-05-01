
# from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# # load once (global)
# _analyzer = SentimentIntensityAnalyzer()

# def analyze_text(text: str):
#     """
#     Returns:
#     {
#         label: POSITIVE | NEGATIVE,
#         score: float,
#         mood: your system mood
#     }
#     """

#     scores = _analyzer.polarity_scores(text)

#     compound = scores["compound"]  # -1 to +1
#     text_l = text.lower()

#     # --- map to your mood system ---
#     if compound >= 0.6:
#         mood = "excellent"
#     elif compound >= 0.2:
#         mood = "happy"

#     elif compound <= -0.6:
#         mood = "sad"
#     elif compound <= -0.2:
#         if any(w in text_l for w in ["anxious", "worried", "nervous"]):
#             mood = "anxious"
#         elif any(w in text_l for w in ["angry", "frustrated", "mad"]):
#             mood = "angry"
#         else:
#             mood = "sad"
#     else:
#         mood = "neutral"

#     return {
#         "label": "POSITIVE" if compound >= 0 else "NEGATIVE",
#         "score": abs(compound),
#         "mood": mood
#     }



# sentiment.py

from transformers import pipeline

# -------------------------------
# Lazy-loaded singleton
# -------------------------------
_model = None

def get_model():
    global _model
    if _model is None:
        _model = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            return_all_scores=True
        )
    return _model


# -------------------------------
# Chunking (still needed for long text)
# -------------------------------
def split_text(text, max_len=400):
    sentences = text.split(". ")
    chunks, current = [], ""

    for s in sentences:
        if len(current) + len(s) < max_len:
            current += s + ". "
        else:
            chunks.append(current.strip())
            current = s + ". "

    if current:
        chunks.append(current.strip())

    return chunks


# -------------------------------
# Emotion → your mood mapping
# -------------------------------
def map_emotion_to_mood(emotion: str):
    if emotion == "joy":
        return "happy"
    elif emotion == "sadness":
        return "sad"
    elif emotion == "anger":
        return "angry"
    elif emotion == "fear":
        return "anxious"
    elif emotion == "neutral":
        return "neutral"
    else:
        return "neutral"


# -------------------------------
# Main function (drop-in replacement)
# -------------------------------
def analyze_text(text: str):
    model = get_model()
    chunks = split_text(text)

    aggregated = {}

    for chunk in chunks:
        outputs = model(chunk[:512])

        # Normalize output
        if isinstance(outputs[0], list):
            results = outputs[0]  # return_all_scores=True case
        else:
            results = outputs     # single prediction case

        for r in results:
            if isinstance(r, dict):
                label = r["label"]
                score = r["score"]
            else:
                # fallback if model returns string label
                label = r
                score = 1.0

            aggregated[label] = aggregated.get(label, 0) + score

    # average scores
    for k in aggregated:
        aggregated[k] /= len(chunks)

    # pick best emotion
    best_emotion = max(aggregated, key=aggregated.get)
    best_score = aggregated[best_emotion]

    mood = map_emotion_to_mood(best_emotion)

    return {
        "label": "POSITIVE" if mood in ["happy"] else "NEGATIVE",
        "score": float(best_score),
        "mood": mood
    }