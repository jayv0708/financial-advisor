"""
train_classifier.py
===================
Trains an Expense Category Classifier using:
  - TF-IDF vectorizer (text → numerical feature matrix)
  - Logistic Regression (multi-class, one-vs-rest)

Pipeline:
  raw text → clean_text → TF-IDF vectors → Logistic Regression → category label

Output:
  Trained vectorizer + classifier, ready for export_model.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from preprocess import load_and_clean_transactions, build_tfidf_vectorizer


DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "transactions.csv")


def train_classifier() -> Pipeline:
    """
    Full training routine for the expense classifier.
    Returns a fitted sklearn Pipeline (TfidfVectorizer + LogisticRegression).
    """
    print("=" * 50)
    print("TRAINING: Expense Category Classifier")
    print("=" * 50)

    # 1. Load and preprocess data
    df = load_and_clean_transactions(DATA_PATH)
    print(f"  Loaded {len(df)} labeled transactions")
    print(f"  Category distribution:\n{df['category'].value_counts().to_string()}\n")

    X = df["clean_text"]
    y = df["category"]

    # 2. Hold-out split for quick diagnostic reporting
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 3. Build sklearn Pipeline
    # TF-IDF converts text to a sparse numerical matrix
    # LogisticRegression with multinomial predicts one-vs-all class probabilities
    pipeline = Pipeline([
        ("tfidf", build_tfidf_vectorizer(max_features=500)),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=1.0,
            solver="lbfgs",
            multi_class="multinomial",
            random_state=42
        ))
    ])

    # 4. Fit on hold-out split for evaluation only
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Hold-out accuracy : {acc:.4f}\n")
    print(classification_report(y_test, y_pred, zero_division=0))

    # 5. IMPORTANT: Refit on ALL data for final export!
    #    This ensures the exported model has seen every pattern.
    print("  Refitting on full dataset for production export...")
    pipeline.fit(X, y)
    print(f"  Full-data accuracy: {pipeline.score(X, y):.4f}\n")

    return pipeline


if __name__ == "__main__":
    train_classifier()
