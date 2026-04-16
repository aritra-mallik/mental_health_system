#AI_MH/features/feature_builder.py
def build_features(data):
    return [
        data["sentiment"],
        data["questionnaire_score"]
    ]