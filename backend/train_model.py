import os
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)
import joblib


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "smart_farm_soil_health_dataset.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "soil_health_model.pkl"
)


# ============================================================
# CREATE MODEL DIRECTORY
# ============================================================

os.makedirs(MODEL_DIR, exist_ok=True)


# ============================================================
# LOAD DATASET
# ============================================================

print("\n========================================")
print("       SMART FARM AI MODEL TRAINING")
print("========================================")

print("\nLoading dataset...")

df = pd.read_csv(DATASET_PATH)

print(f"Dataset loaded successfully.")
print(f"Number of samples : {len(df)}")
print(f"Number of columns : {len(df.columns)}")


# ============================================================
# FEATURES
# ============================================================

features = [
    "moisture",
    "pH",
    "EC",
    "nitrogen",
    "phosphorus",
    "potassium",
    "soilTemperature",
    "airTemperature",
    "airHumidity"
]

target = "soilHealth"


# ============================================================
# CHECK REQUIRED COLUMNS
# ============================================================

missing_columns = [
    column
    for column in features + [target]
    if column not in df.columns
]

if missing_columns:

    raise ValueError(
        f"Missing columns in dataset: {missing_columns}"
    )


# ============================================================
# INPUT AND OUTPUT
# ============================================================

X = df[features]
y = df[target]


print("\nFeatures:")
for feature in features:
    print(f"  - {feature}")

print(f"\nTarget: {target}")


# ============================================================
# CLASS DISTRIBUTION
# ============================================================

print("\nClass distribution:")

print(
    y.value_counts()
)


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\n========================================")
print("           DATASET SPLIT")
print("========================================")

print(f"Training samples : {len(X_train)}")
print(f"Testing samples  : {len(X_test)}")


# ============================================================
# RANDOM FOREST MODEL
# ============================================================

print("\n========================================")
print("        TRAINING RANDOM FOREST")
print("========================================")

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1
)


model.fit(
    X_train,
    y_train
)

print("Model training completed.")


# ============================================================
# PREDICTIONS
# ============================================================

y_pred = model.predict(X_test)


# ============================================================
# ACCURACY
# ============================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

print("\n========================================")
print("             MODEL RESULTS")
print("========================================")

print(
    f"\nAccuracy: {accuracy * 100:.2f}%"
)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred
    )
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

print("\nConfusion Matrix:")

cm = confusion_matrix(
    y_test,
    y_pred
)

print(cm)


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

print("\n========================================")
print("          FEATURE IMPORTANCE")
print("========================================")

feature_importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_
})

feature_importance = feature_importance.sort_values(
    by="importance",
    ascending=False
)

for _, row in feature_importance.iterrows():

    print(
        f"{row['feature']:20s} "
        f"{row['importance']:.4f}"
    )


# ============================================================
# SAVE MODEL
# ============================================================

joblib.dump(
    model,
    MODEL_PATH
)

print("\n========================================")
print("          MODEL SAVED SUCCESSFULLY")
print("========================================")

print(
    f"\nModel location:\n{MODEL_PATH}"
)

print("\nTraining process completed.")