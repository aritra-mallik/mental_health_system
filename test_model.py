# from ml.input_schema import MentalHealthInput
# from ml.predict import predict_all
# from rules.rule_engine import evaluate_risk


# # Step 1: Create input
# data = MentalHealthInput(
#     text="I feel very stressed and tired",
#     sentiment=-0.4,
#     phq_score=12,
#     gad_score=9,
#     history_len=2
# )

# # Step 2: Predict
# preds = predict_all(
#     data.sentiment,
#     data.phq_score,
#     data.gad_score
# )

# # Step 3: Rule engine
# result = evaluate_risk(
#     text=data.text,
#     sentiment=data.sentiment,
#     phq_risk=preds["phq_risk"],
#     gad_risk=preds["gad_risk"],
#     history_len=data.history_len
# )

# print(result)

from AI_MH.ml.predict import predict_all

result = predict_all(0, 10, 8)

print("OUTPUT:")
print(result)