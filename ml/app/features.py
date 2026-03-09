"""Feature engineering for auction price prediction."""

from typing import Any


# Categorical encoding maps
ENGINE_SWAP_MAP = {"none": 0, "s14": 1, "m42": 2, "f20c": 3, "other": 4}
MILEAGE_BAND_MAP = {"<50k": 0, "50-100k": 1, "100-150k": 2, ">150k": 3, "unknown": 2}
RUST_GRADE_MAP = {"none": 0, "minor": 1, "moderate": 2, "heavy": 3, "unknown": 1}
LOCATION_REGION_MAP = {
    "west": 0,
    "southwest": 1,
    "midwest": 2,
    "southeast": 3,
    "northeast": 4,
    "unknown": 2,
}


def build_feature_vector(raw: dict[str, Any]) -> dict[str, float]:
    """
    Transform raw auction attributes into a numeric feature vector
    suitable for the XGBoost model.
    """
    features: dict[str, float] = {}

    # Static features
    features["year_of_car"] = float(raw.get("year_of_car") or 1972)
    features["is_tii"] = 1.0 if raw.get("is_tii") else 0.0
    features["has_ac"] = 1.0 if raw.get("has_ac") else 0.0
    features["has_5_speed"] = 1.0 if raw.get("has_5_speed") else 0.0
    features["engine_swap_type"] = float(
        ENGINE_SWAP_MAP.get(raw.get("engine_swap_type", "none"), 0)
    )
    features["has_widebody"] = 1.0 if raw.get("has_widebody") else 0.0
    features["has_recaro"] = 1.0 if raw.get("has_recaro") else 0.0
    features["has_ducktail"] = 1.0 if raw.get("has_ducktail") else 0.0
    features["has_lsd"] = 1.0 if raw.get("has_lsd") else 0.0
    features["mileage_band"] = float(
        MILEAGE_BAND_MAP.get(raw.get("mileage_band", "unknown"), 2)
    )
    features["rust_grade"] = float(
        RUST_GRADE_MAP.get(raw.get("rust_grade", "unknown"), 1)
    )
    features["color_desirability"] = float(raw.get("color_desirability", 0.5))
    features["location_region"] = float(
        LOCATION_REGION_MAP.get(raw.get("location_region", "unknown"), 2)
    )

    # Dynamic features
    features["current_bid"] = float(raw.get("current_bid", 0))
    features["bid_count"] = float(raw.get("bid_count", 0))
    features["hours_remaining"] = float(raw.get("hours_remaining", 48.0))
    features["bid_velocity_1h"] = float(raw.get("bid_velocity_1h", 0.0))
    features["bid_velocity_6h"] = float(raw.get("bid_velocity_6h", 0.0))
    features["bid_velocity_24h"] = float(raw.get("bid_velocity_24h", 0.0))

    # Velocity acceleration
    v24 = features["bid_velocity_24h"]
    v1 = features["bid_velocity_1h"]
    features["velocity_acceleration"] = v1 / v24 if v24 > 0 else v1

    features["reserve_met"] = 1.0 if raw.get("reserve_met") else 0.0

    # Market context
    features["category_median_30d"] = float(
        raw.get("category_median_30d") or 25000
    )
    features["category_volume_30d"] = float(
        raw.get("category_volume_30d") or 5
    )

    return features
