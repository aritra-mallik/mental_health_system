# AI_MH/ml/predict.py

from AI_MH.ml.phq_predict import predict_phq
from AI_MH.ml.gad_predict import predict_gad
from AI_MH.rules.rule_engine import combine_risk, get_strategy


def predict_all(sentiment, phq_score, gad_score):

    phq_risk = predict_phq(sentiment, phq_score) if phq_score is not None else None
    gad_risk = predict_gad(sentiment, gad_score) if gad_score is not None else None

    # --- Safe combine ---
    if phq_risk and gad_risk:
        final_risk = combine_risk(phq_risk, gad_risk)
    else:
        final_risk = phq_risk or gad_risk or "LOW"

    strategy = get_strategy(final_risk, False)

    return {
        "phq_risk": phq_risk,
        "gad_risk": gad_risk,
        "final_risk": final_risk,
        "strategy": strategy,
        "sentiment": sentiment
    }