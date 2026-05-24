"""
Risk mapper utility.
Converts anomaly scores to risk levels and confidence.
"""

from app.config.settings import RISK_THRESHOLDS


def map_anomaly_score_to_risk(anomaly_score: float) -> str:
    """
    Convert anomaly score (0-1) to risk level.
    
    Args:
        anomaly_score: Float between 0 and 1
        
    Returns:
        Risk level: CRITICAL, HIGH, MEDIUM, or LOW
    """
    if anomaly_score >= RISK_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    elif anomaly_score >= RISK_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif anomaly_score >= RISK_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    else:
        return "LOW"


def calculate_confidence(anomaly_score: float) -> float:
    """
    Calculate confidence from anomaly score.
    
    Args:
        anomaly_score: Anomaly score 0-1
        
    Returns:
        Confidence score 0-1
    """
    # Slightly boost anomaly score for confidence (ML findings are valuable)
    confidence = min(anomaly_score * 1.0, 1.0)
    return round(confidence, 4)


def get_top_features(
    feature_dict: dict,
    top_n: int = 5
) -> dict:
    """
    Get top N features by absolute value.
    
    Args:
        feature_dict: Dictionary of features and their values
        top_n: Number of top features to return
        
    Returns:
        Dictionary of top features
    """
    if not feature_dict:
        return {}
    
    sorted_features = sorted(
        feature_dict.items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )
    
    return dict(sorted_features[:top_n])
