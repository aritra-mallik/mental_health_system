#---------#
#Legacy Generator
#---------#

# import numpy as np
# import pandas as pd
# import random


# def generate_sentiment(mood):
#     base = np.random.normal(0, 0.5)  

#     if mood <= 3:
#         base -= 0.3
#     elif mood >= 7:
#         base += 0.3

#     return float(np.clip(base, -1, 1))



# def assign_risk(mood, stress, energy, control, sentiment):


#     if (
#         (mood <= 3 and stress >= 7 and energy <= 3)
#         or (control <= 3 and stress >= 8)
#         or (sentiment < -0.7 and mood <= 5)  
#     ):
#         return 2

#     if (
#         (mood <= 6 and stress >= 5 and not (mood <= 3 and stress >= 7))  
#         or (energy <= 4 and control <= 5)
#         or (sentiment < -0.3)
#     ):
#         return 1

#     return 0


# def generate_features():

#     mood = random.randint(1, 10)


#     if mood < 5:
#         stress = random.randint(5, 10)
#     else:
#         stress = random.randint(1, 7)


#     stress = int(np.clip(stress + np.random.normal(0, 1.5), 1, 10))

#     energy = int(np.clip(mood + np.random.normal(0, 2), 1, 10))
#     control = int(np.clip(mood + np.random.normal(0, 3), 1, 10))

#     sentiment = generate_sentiment(mood)

#     return mood, stress, energy, control, sentiment

# def generate_balanced_dataset(target_per_class=1500, noise_level=0.02):

#     data = {0: [], 1: [], 2: []}

#     while min(len(data[0]), len(data[1]), len(data[2])) < target_per_class:

#         mood, stress, energy, control, sentiment = generate_features()
#         risk = assign_risk(mood, stress, energy, control, sentiment)

   
#         if random.random() < noise_level:
#             risk = max(0, min(2, risk + random.choice([-1, 1])))

#         if len(data[risk]) < target_per_class:
#             data[risk].append([mood, stress, energy, control, sentiment, risk])

#     df = pd.DataFrame(
#         data[0] + data[1] + data[2],
#         columns=["mood", "stress", "energy", "control", "sentiment", "risk"]
#     )

#     return df.sample(frac=1, random_state=42)  # shuffle


# if __name__ == "__main__":

#     df = generate_balanced_dataset(2000)

#     print(df.head())
#     print("\nClass Distribution:")
#     print(df["risk"].value_counts())

#     df.to_csv("data/mental_health_dataset.csv", index=False)








#---------------------------------------------------------------------------------------------------------------#
#Version 1 : Sentiment + Mood
#---------------------------------------------------------------------------------------------------------------#


import numpy as np
import pandas as pd
import random


# -----------------------------
# Sentiment Generator (PHQ-aligned)
# -----------------------------
def generate_sentiment(score):
    base = np.random.normal(0, 0.5)

    # PHQ-9 severity alignment
    if score >= 20:          # severe
        base -= 0.5
    elif score >= 15:        # moderately severe
        base -= 0.3
    elif score >= 10:        # moderate
        base -= 0.2
    elif score <= 4:         # minimal
        base += 0.3

    return float(np.clip(base, -1, 1))


# -----------------------------
# Risk Assignment (Clean Mapping)
# -----------------------------
def assign_risk(score, sentiment):

    # HIGH RISK (moderately severe + severe)
    if score >= 15:
        return 2

    # MEDIUM RISK (moderate + negative sentiment influence)
    if score >= 10 or sentiment < -0.4:
        return 1

    # LOW RISK
    return 0


# -----------------------------
# Feature Generator
# -----------------------------
def generate_features():

    # PHQ-9 score distribution (slightly skewed toward mild/moderate)
    score = int(np.clip(np.random.normal(8, 6), 0, 27))

    sentiment = generate_sentiment(score)

    return score, sentiment


# -----------------------------
# Balanced Dataset Generator
# -----------------------------
def generate_balanced_dataset(target_per_class=1500, noise_level=0.02):

    data = {0: [], 1: [], 2: []}

    while min(len(data[0]), len(data[1]), len(data[2])) < target_per_class:

        questionnaire_score, sentiment = generate_features()
        risk = assign_risk(questionnaire_score, sentiment)

        # Add slight noise for realism
        if random.random() < noise_level:
            risk = max(0, min(2, risk + random.choice([-1, 1])))

        if len(data[risk]) < target_per_class:
            data[risk].append([
                sentiment,
                questionnaire_score,
                risk
            ])

    df = pd.DataFrame(
        data[0] + data[1] + data[2],
        columns=["sentiment", "questionnaire_score", "risk"]
    )

    return df.sample(frac=1, random_state=42)


# -----------------------------
# Run Script
# -----------------------------
if __name__ == "__main__":

    df = generate_balanced_dataset(2000)

    print(df.head())
    print("\nClass Distribution:")
    print(df["risk"].value_counts())

    df.to_csv("data/phq_mental_health_dataset.csv", index=False)
    

# -----------------------------
# Sentiment Generator (GAD-aligned)
# -----------------------------
def generate_sentiment(score):
    base = np.random.normal(0, 0.5)

    # GAD-7 severity alignment (0–21)
    if score >= 15:        # severe
        base -= 0.5
    elif score >= 10:      # moderate
        base -= 0.3
    elif score >= 5:       # mild
        base -= 0.1
    elif score <= 4:       # minimal
        base += 0.3

    return float(np.clip(base, -1, 1))


# -----------------------------
# Risk Assignment (GAD mapping)
# -----------------------------
def assign_risk(score, sentiment):

    # HIGH RISK (severe)
    if score >= 15:
        return 2

    # MEDIUM RISK (moderate or negative sentiment)
    if score >= 10 or sentiment < -0.4:
        return 1

    # LOW RISK
    return 0


# -----------------------------
# Feature Generator
# -----------------------------
def generate_features():

    # GAD-7 score distribution (0–21)
    score = int(np.clip(np.random.normal(7, 5), 0, 21))

    sentiment = generate_sentiment(score)

    return score, sentiment


# -----------------------------
# Balanced Dataset Generator
# -----------------------------
def generate_balanced_dataset(target_per_class=1500, noise_level=0.02):

    data = {0: [], 1: [], 2: []}

    while min(len(data[0]), len(data[1]), len(data[2])) < target_per_class:

        questionnaire_score, sentiment = generate_features()
        risk = assign_risk(questionnaire_score, sentiment)

        if random.random() < noise_level:
            risk = max(0, min(2, risk + random.choice([-1, 1])))

        if len(data[risk]) < target_per_class:
            data[risk].append([
                sentiment,
                questionnaire_score,
                risk
            ])

    df = pd.DataFrame(
        data[0] + data[1] + data[2],
        columns=["sentiment", "questionnaire_score", "risk"]
    )

    return df.sample(frac=1, random_state=42)


if __name__ == "__main__":

    df = generate_balanced_dataset(2000)

    print(df.head())
    print("\nClass Distribution:")
    print(df["risk"].value_counts())

    df.to_csv("data/gad_mental_health_dataset.csv", index=False)