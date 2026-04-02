
CRISIS_KEYWORDS = [
    "kill myself",
    "suicide",
    "end my life",
    "don't want to live",
    "want to die",
    "self harm"
]


def check_crisis_keywords(text):
    """
    Detects presence of crisis phrases
    """
    text = text.lower()

    for phrase in CRISIS_KEYWORDS:
        if phrase in text:
            return True

    return False


def apply_safety_layer(risk, sentiment, text=None):


 
    if sentiment is not None and sentiment < -0.8:
        return 2  

    if text is not None and check_crisis_keywords(text):
        return 2 

    return risk