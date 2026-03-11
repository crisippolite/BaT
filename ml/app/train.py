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
import requests
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score

from .features import build_feature_vector

MODEL_DIR = os.environ.get("MODEL_DIR", "models")


def fetch_training_data(convex_url: str) -> pd.DataFrame:
    """
    Fetch completed auction data from the Convex HTTP export endpoint.

    The endpoint returns an array of auction objects with attributes,
    bid counts, and final prices for all ended auctions.
    """
    scraper_secret = os.environ.get("SCRAPER_SECRET", "")
    if not scraper_secret:
        print("[train] Error: SCRAPER_SECRET env var required for data export")
        return pd.DataFrame()

    # Build the export URL from the Convex site URL
    # convex_url is like https://xxx.convex.cloud, site URL is https://xxx.convex.site
    site_url = convex_url.replace(".convex.cloud", ".convex.site")
    export_url = f"{site_url}/export/training-data"

    print(f"[train] Fetching training data from {export_url}")

    try:
        response = requests.get(
            export_url,
            headers={"Authorization": f"Bearer {scraper_secret}"},
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()

        if not data:
            print("[train] No completed auctions found")
            return pd.DataFrame()

        df = pd.DataFrame(data)
        print(f"[train] Fetched {len(df)} completed auctions")

        # Filter: only rows with a valid final price
        df = df[df["finalPrice"].notna() & (df["finalPrice"] > 0)]
        print(f"[train] {len(df)} auctions with valid final prices")

        # Rename finalPrice to final_price for compatibility with prepare_features
        df = df.rename(columns={"finalPrice": "final_price"})

        return df

    except requests.RequestException as e:
        print(f"[train] Failed to fetch training data: {e}")
        return pd.DataFrame()


def prepare_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Transform raw auction data into feature vectors and target.
    Maps the Convex export format to the feature engineering input format.
    """
    feature_rows = []
    targets = []

    for _, row in df.iterrows():
        title_lower = str(row.get("title", "")).lower()
        engine_lower = str(row.get("engine") or "").lower()
        transmission_lower = str(row.get("transmission") or "").lower()

        # Map export columns to feature input format
        raw = {
            "year_of_car": row.get("year"),
            "is_tii": "tii" in title_lower or "injection" in engine_lower,
            "has_ac": bool(row.get("hasAc")),
            "has_5_speed": "5-speed" in transmission_lower or "5-speed" in title_lower,
            "engine_swap_type": _detect_engine_swap(engine_lower),
            "has_widebody": "widebody" in title_lower or "wide body" in title_lower,
            "has_recaro": "recaro" in title_lower,
            "has_ducktail": "ducktail" in title_lower,
            "has_lsd": "lsd" in title_lower or "limited slip" in title_lower,
            "mileage_band": _classify_mileage(row.get("mileage")),
            "rust_grade": _classify_rust(row.get("rustNotes")),
            "color_desirability": 0.5,
            "location_region": "unknown",
            "current_bid": row.get("currentBid") or row.get("final_price", 0),
            "bid_count": row.get("bidCount", 0),
            "hours_remaining": 0.0,  # Ended auctions
            "bid_velocity_1h": 0.0,
            "bid_velocity_6h": 0.0,
            "bid_velocity_24h": 0.0,
            "reserve_met": row.get("reserveStatus") == "met",
        }

        # Check bonus features if available
        bonus = row.get("bonusFeatures", [])
        if isinstance(bonus, list):
            for key in bonus:
                if key == "has_ac":
                    raw["has_ac"] = True
                elif key == "s14_swap":
                    raw["engine_swap_type"] = "s14"

        features = build_feature_vector(raw)
        feature_rows.append(features)
        targets.append(row["final_price"])

    X = pd.DataFrame(feature_rows)
    y = pd.Series(targets, name="final_price")
    return X, y


def _detect_engine_swap(engine: str) -> str:
    if "s14" in engine:
        return "s14"
    if "m42" in engine:
        return "m42"
    if "f20c" in engine:
        return "f20c"
    if "swap" in engine or "converted" in engine:
        return "other"
    return "none"


def _classify_mileage(mileage: Any) -> str:
    if not mileage:
        return "unknown"
    import re
    nums = re.findall(r"\d+", str(mileage).replace(",", ""))
    if not nums:
        return "unknown"
    val = int(nums[0])
    if val < 50000:
        return "<50k"
    if val < 100000:
        return "50-100k"
    if val < 150000:
        return "100-150k"
    return ">150k"


def _classify_rust(notes: Any) -> str:
    if not notes:
        return "unknown"
    lower = str(notes).lower()
    if "none" in lower or "rust-free" in lower:
        return "none"
    if "minor" in lower or "light" in lower:
        return "minor"
    if "moderate" in lower or "some" in lower:
        return "moderate"
    if "heavy" in lower or "significant" in lower:
        return "heavy"
    return "unknown"


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
