import joblib

from feature_extractor import extract_features_from_mood_checkin
from rule_engine import get_recommendation
from safety_layer import apply_safety_layer
from sentiment_analyzer import get_sentiment


model = joblib.load("risk_model.pkl")


text = "I feel very happy"

mood = 9
stress = 8
energy = 2
control = 4


sentiment = get_sentiment(text)


features = extract_features_from_mood_checkin(
    mood, stress, energy, control, sentiment
)

risk = model.predict(features)[0]


final_risk = apply_safety_layer(risk, sentiment, text)


response = get_recommendation(final_risk)


print("Sentiment:", sentiment)
print("Risk:", final_risk)
print("Response:", response["message"])