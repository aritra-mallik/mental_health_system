# import re

# PUNCT_RE = re.compile(r"[^\w\s']")
# SPACE_RE = re.compile(r"\s+")

# def normalize(text: str) -> str:
#     text = text.lower()
#     text = PUNCT_RE.sub(" ", text)
#     text = SPACE_RE.sub(" ", text).strip()
#     return text


# HIGH_INTENT = [
#     r"\bkill\s+(myself|my\s*self)\b",
#     r"\bend\s+(my\s+)?life\b",
#     r"\bi\s+(just\s+)?(really\s+)?want\s+to\s+die\b",
#     r"\bi\s+will\s+kill\s+myself\b",
#     r"\bi\s+am\s+going\s+to\s+kill\s+myself\b",
#     r"\bi\s+feel\s+like\s+dying\b",
# ]

# METHOD_SEEKING = [
#     r"\bhow\s+to\s+(kill\s+myself|die|commit\s+suicide)\b",
#     r"\bways\s+to\s+(die|kill\s+myself)\b",
# ]

# NEGATIONS = [
#     "not suicidal",
#     "i am not suicidal",
#     "i don't want to die",
#     "i do not want to die",
#     "i don't want to kill myself",
# ]

# HOPELESSNESS = [
#     "nothing matters anymore",
#     "no reason to live",
#     "i can't go on",
#     "i give up",
#     "what's the point of living",
# ]

# SELF_NEGATION = [
#     "i hate being alive",
#     "i wish i was gone",
#     "better off dead",
#     "no one would care if i died",
#     "everyone would be better without me",
# ]

# HIGH_INTENT_RE = [re.compile(p) for p in HIGH_INTENT]
# METHOD_RE = [re.compile(p) for p in METHOD_SEEKING]


# def score_text(text: str) -> int:
#     t = normalize(text)

#     for neg in NEGATIONS:
#         if neg in t:
#             return 0

#     score = 0

#     for p in HIGH_INTENT_RE:
#         if p.search(t):
#             return 100

#     for p in METHOD_RE:
#         if p.search(t):
#             score += 70

#     for phrase in HOPELESSNESS:
#         if phrase in t:
#             score += 20

#     for phrase in SELF_NEGATION:
#         if phrase in t:
#             score += 25

#     if any(w in t for w in ["die", "dead", "suicide", "kill"]):
#         score += 15

#     return score


# def check_critical(text: str) -> bool:
#     if not text or len(text.strip()) < 5:
#         return False

#     return score_text(text) >= 70

import re
from transformers import pipeline

PUNCT_RE = re.compile(r"[^\w\s']")
SPACE_RE = re.compile(r"\s+")


def normalize(text: str) -> str:

    text = text.lower()

    # normalize unicode apostrophes
    text = text.replace("’", "'")

    # normalize common contractions
    text = text.replace("dont", "don't")
    text = text.replace("cant", "can't")
    text = text.replace("wont", "won't")

    text = PUNCT_RE.sub(" ", text)
    text = SPACE_RE.sub(" ", text).strip()

    return text


# -------------------------
# Lazy-loaded singleton
# -------------------------
_model = None


def get_model():

    global _model

    if _model is None:

        _model = pipeline(
            "text-classification",
            model="wcyat/distilbert-suicide-detection-hk"
        )

    return _model


# -------------------------
# Hard safety overrides
# -------------------------
HIGH_RISK_PATTERNS = [

    # explicit intent
    r"\bi will kill myself\b",
    r"\bi am going to kill myself\b",
    r"\bend my life\b",

    # method seeking
    r"\bhow to commit suicide\b",
    r"\bhow to kill myself\b",

    # passive suicidal ideation
    r"\bi don't want to live anymore\b",
    r"\bi want to die\b",
    r"\bi wish i was dead\b",
    r"\bbetter off dead\b",
    r"\bno reason to live\b",
    r"\bi can't go on\b",
]


NEGATIONS = [
    "not suicidal",
    "i am not suicidal",
    "i don't want to die",
    "i do not want to die",
    "i don't want to kill myself",
]


RECOVERY_PATTERNS = [

    r"\bi talked to a professional\b",
    r"\bi spoke to a therapist\b",
    r"\bi got help\b",
    r"\bit helped\b",
    r"\bi feel better\b",
    r"\bi am feeling better\b",
    r"\bthings are improving\b",
    r"\bi reached out\b",
]


HIGH_RISK_RE = [
    re.compile(p)
    for p in HIGH_RISK_PATTERNS
]


RECOVERY_RE = [
    re.compile(p)
    for p in RECOVERY_PATTERNS
]


# -------------------------
# Main detector
# -------------------------
def check_critical(text: str) -> bool:

    if not text or len(text.strip()) < 5:
        return False

    t = normalize(text)

    # -------------------------
    # Recovery override
    # -------------------------
    for pattern in RECOVERY_RE:

        if pattern.search(t):

            print("Recovery signal detected")

            return False

    # -------------------------
    # Negation override
    # -------------------------
    for neg in NEGATIONS:

        if neg in t:

            print("Negation detected")

            return False

    # -------------------------
    # Explicit hard override
    # -------------------------
    for pattern in HIGH_RISK_RE:

        if pattern.search(t):

            print("Critical detected via regex")
            print("Matched pattern:", pattern.pattern)

            return True

    # -------------------------
    # Transformer inference
    # -------------------------
    model = get_model()

    try:

        result = model(text[:512])[0]

        print("Safety model result:", result)

    except Exception as e:

        print("Safety model error:", e)

        return False

    label = result["label"]
    score = float(result["score"])

    # -------------------------
    # Semantic self-harm detection
    # -------------------------
    decision = (
        label == "LABEL_1"
        and score >= 0.97 
    )

    print("Critical decision:", decision)

    return decision