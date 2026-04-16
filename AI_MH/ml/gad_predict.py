#AI_MH/ml/gad_predict.py

import joblib
import os

import pandas as pd
from AI_MH.features.feature_builder import build_features


MODEL_PATH = os.path.join(os.path.dirname(__file__), "gad_model.pkl")
model = joblib.load(MODEL_PATH)


def predict_gad(sentiment, questionnaire_score):

    features = build_features({
        "sentiment": sentiment,
        "questionnaire_score": questionnaire_score
    })


    df = pd.DataFrame([{
    "sentiment": features[0],
    "questionnaire_score": features[1]
    }])

    pred = model.predict(df)[0]

    mapping = {
        0: "LOW",
        1: "MEDIUM",
        2: "HIGH"
    }

    return mapping[pred]