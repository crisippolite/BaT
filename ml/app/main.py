"""BaT Signal ML Service — Price prediction API."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import time

from .model import PredictionModel
from .features import build_feature_vector

app = FastAPI(
    title="BaT Signal ML Service",
    description="Price prediction and confidence intervals for BMW 2002 auctions",
    version="0.1.0",
)

# Initialize model
model = PredictionModel()


class PredictionRequest(BaseModel):
    """Auction features for prediction."""
    # Static features
    year_of_car: Optional[int] = None
    is_tii: bool = False
    has_ac: bool = False
    has_5_speed: bool = False
    engine_swap_type: str = "none"
    has_widebody: bool = False
    has_recaro: bool = False
    has_ducktail: bool = False
    has_lsd: bool = False
    mileage_band: str = "unknown"
    rust_grade: str = "unknown"
    color_desirability: float = 0.5
    location_region: str = "unknown"

    # Dynamic features
    current_bid: int = 0
    bid_count: int = 0
    hours_remaining: float = 48.0
    bid_velocity_1h: float = 0.0
    bid_velocity_6h: float = 0.0
    bid_velocity_24h: float = 0.0
    reserve_met: bool = False

    # Market context
    category_median_30d: Optional[int] = None
    category_volume_30d: Optional[int] = None


class PredictionResponse(BaseModel):
    """Prediction result with confidence interval."""
    predicted_final: int
    confidence_low: int
    confidence_high: int
    model_version: str
    predicted_at: float
    features_used: dict


class TrainRequest(BaseModel):
    """Trigger model retraining."""
    force: bool = False


class ModelInfo(BaseModel):
    """Current model metadata."""
    version: str
    trained_at: Optional[float]
    training_samples: Optional[int]
    mae: Optional[float]
    mape: Optional[float]
    r2: Optional[float]


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model.is_loaded()}


@app.get("/model/info", response_model=ModelInfo)
async def model_info():
    return model.get_info()


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Generate price prediction for an auction."""
    features = build_feature_vector(request.model_dump())
    prediction = model.predict(features)

    return PredictionResponse(
        predicted_final=prediction["predicted_final"],
        confidence_low=prediction["confidence_low"],
        confidence_high=prediction["confidence_high"],
        model_version=model.version,
        predicted_at=time.time(),
        features_used=features,
    )


@app.post("/train")
async def train(request: TrainRequest):
    """Trigger model retraining."""
    convex_url = os.environ.get("CONVEX_URL", "")
    if not convex_url:
        raise HTTPException(status_code=500, detail="CONVEX_URL env var not set")

    from .train import fetch_training_data, prepare_features, train_model, evaluate_model, save_model

    df = fetch_training_data(convex_url)
    if df.empty:
        return {"status": "no_data", "message": "No completed auctions available for training"}

    if len(df) < 10:
        return {"status": "insufficient_data", "message": f"Only {len(df)} auctions — need at least 10"}

    X, y = prepare_features(df)

    # Time-based split
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    models = train_model(X_train, y_train)
    metrics = evaluate_model(models, X_test, y_test)
    version = save_model(models, metrics, len(X_train))

    # Reload the model
    global model
    model = PredictionModel()

    return {
        "status": "success",
        "version": version,
        "training_samples": len(X_train),
        "metrics": metrics,
    }
