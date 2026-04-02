import numpy as np
import pandas as pd
import random

# ----------------------------
# RISK FUNCTION (SOFTER LOGIC)
# ----------------------------
def assign_risk(mood, stress, energy, control, sentiment):

    score = 0

    # weighted scoring instead of hard rules
    score += (10 - mood) * 0.3
    score += stress * 0.3
    score += (10 - energy) * 0.2
    score += (10 - control) * 0.1
    score += (-sentiment * 5) * 0.1

    if score >= 6:
        return 2  # HIGH
    elif score >= 3:
        return 1  # MEDIUM
    else:
        return 0  # LOW


# ----------------------------
# DATA GENERATION
# ----------------------------
def generate_dataset(n_samples=1000, noise_level=0.1):

    data = []

    for _ in range(n_samples):

        # latent mental state (continuous, not discrete)
        base = np.clip(np.random.normal(loc=5, scale=2), 1, 10)

        # correlated features
        mood = np.clip(base + np.random.normal(0, 1.5), 1, 10)
        stress = np.clip(10 - base + np.random.normal(0, 1.5), 1, 10)
        energy = np.clip(base + np.random.normal(0, 1.2), 1, 10)
        control = np.clip(base + np.random.normal(0, 1.3), 1, 10)

        # sentiment correlated with mood
        sentiment = np.clip((mood - 5) / 5 + np.random.normal(0, 0.2), -1, 1)

        # rounding to simulate UI input (like sliders)
        mood = int(round(mood))
        stress = int(round(stress))
        energy = int(round(energy))
        control = int(round(control))
        sentiment = round(sentiment, 2)

        risk = assign_risk(mood, stress, energy, control, sentiment)

        # ----------------------------
        # LABEL NOISE (VERY IMPORTANT)
        # ----------------------------
        if random.random() < noise_level:
            risk = random.choice([0, 1, 2])

        data.append([mood, stress, energy, control, sentiment, risk])

    return pd.DataFrame(data, columns=[
        "mood", "stress", "energy", "control", "sentiment", "risk"
    ])


# ----------------------------
# SAVE DATASET
# ----------------------------
if __name__ == "__main__":

    df = generate_dataset(2000)

    print(df.head())
    print(df["risk"].value_counts())

    df.to_csv("mental_health_dataset.csv", index=False)