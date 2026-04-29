import re
from functools import lru_cache
from transformers import pipeline


# -------------------------
# NORMALIZATION
# -------------------------

PUNCT_RE = re.compile(r"[^\w\s']")
SPACE_RE = re.compile(r"\s+")


def normalize(text: str) -> str:
    text = text.lower()
    text = PUNCT_RE.sub(" ", text)
    text = SPACE_RE.sub(" ", text).strip()
    return text


# -------------------------
# RULE-BASED DETECTION
# -------------------------

HIGH_CONF_PATTERNS = [
    re.compile(p) for p in [
        r"\bkill\s+(myself|my\s*self)\b",
        r"\bend\s+(my\s+)?life\b",
        r"\bi\s+(just\s+)?(really\s+)?want\s+to\s+die\b",
        r"\bi\s+feel\s+like\s+dying\b",
        r"\bhow\s+to\s+(kill\s+myself|die|commit\s+suicide)\b",
        r"\bways\s+to\s+(die|kill\s+myself)\b",
        r"\b(i\s+)?don'?t\s+want\s+to\s+live(\s+anymore)?\b",
    ]
]

SOFT_SIGNALS = [
    "tired of everything",
    "nothing matters anymore",
    "i feel empty",
    "i feel numb",
    "i hate being alive",
    "i am done with everything",
    "i just want it to stop",
    "no one would care if i was gone",
    "everyone would be better without me",
]


def rule_based_check(text: str) -> bool:
    t = normalize(text)

    for pattern in HIGH_CONF_PATTERNS:
        if pattern.search(t):
            return True

    score = 0

    for phrase in SOFT_SIGNALS:
        if phrase in t:
            score += 1

    if any(w in t for w in ["die", "dead", "suicide", "kill"]):
        score += 1

    return score >= 2


# -------------------------
# ML MODEL (CACHED)
# -------------------------

@lru_cache(maxsize=1)
def get_classifier():
    """
    Loads once and reuses (critical for performance)
    """
    return pipeline(
        "text-classification",
        model="Akashpaul123/bert-suicide-detection",
        device=-1  # CPU
    )


def ml_check(text: str, threshold: float = 0.7) -> bool:
    try:
        classifier = get_classifier()
        result = classifier(text[:512])[0]  # truncate long input

        # LABEL_1 = suicidal (model-specific)
        return result["label"] == "LABEL_1" and result["score"] >= threshold

    except Exception as e:
        # Fail-safe: never crash your app
        print("ML safety error:", e)
        return False


# -------------------------
# FINAL HYBRID FUNCTION
# -------------------------

def check_critical(text: str) -> bool:
    """
    Main entry point.
    Use this everywhere in your app.
    """

    if not text:
        return False

    # 1. Fast rule-based pass
    if rule_based_check(text):
        return True

    # 2. ML fallback (semantic understanding)
    if ml_check(text):
        return True

    return False