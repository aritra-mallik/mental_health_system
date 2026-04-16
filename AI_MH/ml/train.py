import pandas as pd
import joblib  

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.ensemble import RandomForestClassifier


# -----------------------------
# Load PHQ dataset
# -----------------------------
df = pd.read_csv("data/phq_mental_health_dataset.csv")


# -----------------------------
# Features and Label (STRICT)
# -----------------------------
X = df[["sentiment", "questionnaire_score"]]
y = df["risk"]


# -----------------------------
# Train-Test Split
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# -----------------------------
# Model
# -----------------------------
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=5,
    random_state=42
)

model.fit(X_train, y_train)


# -----------------------------
# Save Model (PHQ-specific)
# -----------------------------
joblib.dump(model, "ml/phq_model.pkl")

print("Model saved as phq_model.pkl")


# -----------------------------
# Evaluation
# -----------------------------
y_pred = model.predict(X_test)

print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))



# -----------------------------
# Load GAD dataset
# -----------------------------
df = pd.read_csv("data/gad_mental_health_dataset.csv")


# -----------------------------
# Features
# -----------------------------
X = df[["sentiment", "questionnaire_score"]]
y = df["risk"]


# -----------------------------
# Split
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# -----------------------------
# Model
# -----------------------------
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=5,
    random_state=42
)

model.fit(X_train, y_train)


# -----------------------------
# Save Model
# -----------------------------
joblib.dump(model, "ml/gad_model.pkl")

print("Model saved as gad_model.pkl")


# -----------------------------
# Evaluation
# -----------------------------
y_pred = model.predict(X_test)

print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))