import pandas as pd

# ----------------------------
# FEATURE EXTRACTION LAYER
# ----------------------------
def extract_features_from_mood_checkin(mood, stress, energy, control, sentiment):
    """
    Returns a DataFrame with correct feature names
    """

    data = {
        "mood": [mood],
        "stress": [stress],
        "energy": [energy],
        "control": [control],
        "sentiment": [sentiment]
    }

    return pd.DataFrame(data)