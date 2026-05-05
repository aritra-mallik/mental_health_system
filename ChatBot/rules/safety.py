import re

PUNCT_RE = re.compile(r"[^\w\s']")
SPACE_RE = re.compile(r"\s+")

def normalize(text: str) -> str:
    text = text.lower()
    text = PUNCT_RE.sub(" ", text)
    text = SPACE_RE.sub(" ", text).strip()
    return text


HIGH_INTENT = [
    r"\bkill\s+(myself|my\s*self)\b",
    r"\bend\s+(my\s+)?life\b",
    r"\bi\s+(just\s+)?(really\s+)?want\s+to\s+die\b",
    r"\bi\s+will\s+kill\s+myself\b",
    r"\bi\s+am\s+going\s+to\s+kill\s+myself\b",
    r"\bi\s+feel\s+like\s+dying\b",
]

METHOD_SEEKING = [
    r"\bhow\s+to\s+(kill\s+myself|die|commit\s+suicide)\b",
    r"\bways\s+to\s+(die|kill\s+myself)\b",
]

NEGATIONS = [
    "not suicidal",
    "i am not suicidal",
    "i don't want to die",
    "i do not want to die",
    "i don't want to kill myself",
]

HOPELESSNESS = [
    "nothing matters anymore",
    "no reason to live",
    "i can't go on",
    "i give up",
    "what's the point of living",
]

SELF_NEGATION = [
    "i hate being alive",
    "i wish i was gone",
    "better off dead",
    "no one would care if i died",
    "everyone would be better without me",
]

HIGH_INTENT_RE = [re.compile(p) for p in HIGH_INTENT]
METHOD_RE = [re.compile(p) for p in METHOD_SEEKING]


def score_text(text: str) -> int:
    t = normalize(text)

    for neg in NEGATIONS:
        if neg in t:
            return 0

    score = 0

    for p in HIGH_INTENT_RE:
        if p.search(t):
            return 100

    for p in METHOD_RE:
        if p.search(t):
            score += 70

    for phrase in HOPELESSNESS:
        if phrase in t:
            score += 20

    for phrase in SELF_NEGATION:
        if phrase in t:
            score += 25

    if any(w in t for w in ["die", "dead", "suicide", "kill"]):
        score += 15

    return score


def check_critical(text: str) -> bool:
    if not text or len(text.strip()) < 5:
        return False

    return score_text(text) >= 70