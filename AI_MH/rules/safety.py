# AI_MH/rules/safety.py

def check_critical(text):
    if not text:
        return False

    t = text.lower()

    # High-confidence phrases only
    CRITICAL_PATTERNS = [
        "kill myself",
        "killing myself",
        "end my life",
        "want to die",
        "suicide",
        "no reason to live",
        "better off dead",
        "hurt myself",
        "self harm"
    ]

    return any(p in t for p in CRITICAL_PATTERNS)