"""
Training pipeline for the BaT Signal price prediction model.

This module handles:
1. Fetching completed auction data from Convex
2. Feature engineering
3. Training XGBoost quantile regression models (P10, P50, P90)
4. Evaluation on time-based holdout set
5. Model persistence with versioning

Usage:
    python -m app.train --convex-url https://your-deployment.convex.cloud
"""

import argparse
import os
import time
from typing import Any

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score

from .features import build_feature_vector

MODEL_DIR = os.environ.get("MODEL_DIR", "models")


def fetch_training_data(convex_url: str) -> pd.DataFrame:
    """
    Fetch completed auction data from Convex.

    TODO: Implement using Convex HTTP API or Python client.
    For now, returns empty DataFrame.
    """
    print(f"[train] Would fetch data from {convex_url}")
    print("[train] Training data fetch not yet implemented")
    return pd.DataFrame()


def prepare_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Transform raw auction data into feature vectors and target.
    """
    feature_rows = []
    targets = []

    for _, row in df.iterrows():
        features = build_feature_vector(row.to_dict())
        feature_rows.append(features)
        targets.append(row["final_price"])

    X = pd.DataFrame(feature_rows)
    y = pd.Series(targets, name="final_price")
    return X, y


def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> dict[str, Any]:
    """
    Train XGBoost quantile regression models.
    Returns dict with models and metadata.
    """
    from xgboost import XGBRegressor

    # P50 (median — point estimate)
    model_p50 = XGBRegressor(
        objective="reg:quantileerror",
        quantile_alpha=0.50,
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
    )
    model_p50.fit(X_train, y_train)

    # P10 (lower bound)
    model_p10 = XGBRegressor(
        objective="reg:quantileerror",
        quantile_alpha=0.10,
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
    )
    model_p10.fit(X_train, y_train)

    # P90 (upper bound)
    model_p90 = XGBRegressor(
        objective="reg:quantileerror",
        quantile_alpha=0.90,
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
    )
    model_p90.fit(X_train, y_train)

    return {
        "model_p50": model_p50,
        "model_p10": model_p10,
        "model_p90": model_p90,
    }


def evaluate_model(
    models: dict, X_test: pd.DataFrame, y_test: pd.Series
) -> dict[str, float]:
    """Evaluate model performance on holdout set."""
    y_pred = models["model_p50"].predict(X_test)

    return {
        "mae": float(mean_absolute_error(y_test, y_pred)),
        "mape": float(mean_absolute_percentage_error(y_test, y_pred)),
        "r2": float(r2_score(y_test, y_pred)),
    }


def save_model(models: dict, metrics: dict, n_samples: int) -> str:
    """Save model with metadata."""
    import joblib

    os.makedirs(MODEL_DIR, exist_ok=True)

    version = f"v1.0.{int(time.time())}"
    info = {
        "version": version,
        "trained_at": time.time(),
        "training_samples": n_samples,
        **metrics,
    }

    payload = {**models, "info": info}

    # Save versioned and current
    versioned_path = os.path.join(MODEL_DIR, f"model-{version}.pkl")
    current_path = os.path.join(MODEL_DIR, "current.pkl")

    joblib.dump(payload, versioned_path)
    joblib.dump(payload, current_path)

    print(f"[train] Saved model {version} to {versioned_path}")
    return version


def main():
    parser = argparse.ArgumentParser(description="Train BaT Signal prediction model")
    parser.add_argument(
        "--convex-url",
        default=os.environ.get("CONVEX_URL", ""),
        help="Convex deployment URL",
    )
    args = parser.parse_args()

    if not args.convex_url:
        print("[train] Error: --convex-url or CONVEX_URL env var required")
        return

    # Fetch data
    df = fetch_training_data(args.convex_url)
    if df.empty:
        print("[train] No training data available. Exiting.")
        return

    # Prepare features
    X, y = prepare_features(df)
    print(f"[train] Prepared {len(X)} samples with {len(X.columns)} features")

    # Time-based split (not random — avoid leakage)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    # Train
    models = train_model(X_train, y_train)

    # Evaluate
    metrics = evaluate_model(models, X_test, y_test)
    print(f"[train] MAE: ${metrics['mae']:.0f}, MAPE: {metrics['mape']:.1%}, R²: {metrics['r2']:.3f}")

    # Save
    version = save_model(models, metrics, len(X_train))
    print(f"[train] Done — model {version}")


if __name__ == "__main__":
    main()
