"""Model loading, prediction, and confidence intervals."""

import os
import time
from typing import Any, Optional

import numpy as np

MODEL_PATH = os.environ.get("MODEL_PATH", "models/current.pkl")


class PredictionModel:
    """Wrapper around the XGBoost prediction model."""

    def __init__(self):
        self.version = "v0.0.1-stub"
        self._model = None
        self._model_p10 = None
        self._model_p90 = None
        self._info = {
            "version": self.version,
            "trained_at": None,
            "training_samples": None,
            "mae": None,
            "mape": None,
            "r2": None,
        }
        self._try_load()

    def _try_load(self) -> None:
        """Attempt to load a trained model from disk."""
        try:
            import joblib

            if os.path.exists(MODEL_PATH):
                saved = joblib.load(MODEL_PATH)
                self._model = saved.get("model_p50")
                self._model_p10 = saved.get("model_p10")
                self._model_p90 = saved.get("model_p90")
                self._info = saved.get("info", self._info)
                self.version = self._info.get("version", self.version)
                print(f"[model] Loaded model {self.version} from {MODEL_PATH}")
            else:
                print(f"[model] No model found at {MODEL_PATH} — using stub predictions")
        except Exception as e:
            print(f"[model] Failed to load model: {e} — using stub predictions")

    def is_loaded(self) -> bool:
        return self._model is not None

    def get_info(self) -> dict[str, Any]:
        return self._info

    def predict(self, features: dict[str, float]) -> dict[str, int]:
        """
        Generate prediction with confidence interval.

        If no trained model is loaded, uses a simple heuristic based on
        current bid and bid velocity as a placeholder.
        """
        if self._model is not None:
            return self._predict_with_model(features)
        return self._predict_stub(features)

    def _predict_with_model(self, features: dict[str, float]) -> dict[str, int]:
        """Use the trained XGBoost model for prediction."""
        import pandas as pd

        feature_names = sorted(features.keys())
        X = pd.DataFrame([{k: features[k] for k in feature_names}])

        predicted_final = int(self._model.predict(X)[0])

        # Confidence interval from quantile models
        if self._model_p10 and self._model_p90:
            confidence_low = int(self._model_p10.predict(X)[0])
            confidence_high = int(self._model_p90.predict(X)[0])
        else:
            # Fallback: ±20% if no quantile models
            confidence_low = int(predicted_final * 0.8)
            confidence_high = int(predicted_final * 1.2)

        return {
            "predicted_final": predicted_final,
            "confidence_low": confidence_low,
            "confidence_high": confidence_high,
        }

    def _predict_stub(self, features: dict[str, float]) -> dict[str, int]:
        """
        Stub prediction using heuristics.
        This runs when no trained model is available.
        """
        current_bid = features.get("current_bid", 0)
        hours_remaining = features.get("hours_remaining", 48)
        bid_velocity_1h = features.get("bid_velocity_1h", 0)
        is_tii = features.get("is_tii", 0)
        has_ac = features.get("has_ac", 0)

        # Base prediction: current bid + estimated remaining increase
        if current_bid == 0:
            # No bids yet — use category median
            base = features.get("category_median_30d", 25000)
        elif hours_remaining > 24:
            # Early in auction — expect significant increase
            base = current_bid * 1.4
        elif hours_remaining > 6:
            # Mid-auction
            base = current_bid * 1.2
        elif hours_remaining > 1:
            # Late auction
            base = current_bid * 1.1
        else:
            # Final hour — close to final price
            base = current_bid * 1.05

        # Adjust for desirable features
        if is_tii:
            base *= 1.15
        if has_ac:
            base *= 1.05

        # Adjust for velocity
        if bid_velocity_1h > 5:
            base *= 1.1

        predicted_final = int(base)

        # Wider confidence interval for stub
        return {
            "predicted_final": predicted_final,
            "confidence_low": int(predicted_final * 0.7),
            "confidence_high": int(predicted_final * 1.35),
        }
