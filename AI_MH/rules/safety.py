#AI_MH/rules/safety.py

def check_critical(text):
    t = text.lower()

    keywords = [
        "kill myself",
        "killing myself",
        "suicide",
        "end my life",
        "want to die",
        "die",
        "no reason to live",
        "give up",
        "giving up"
    ]

    return any(k in t for k in keywords)