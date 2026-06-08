"""
Isolation Forest ML service.
Handles anomaly detection using Isolation Forest algorithm.
"""

import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime
import logging

from app.models.isolation_forest_model import isolation_forest_model
from app.utils.risk_mapper import map_anomaly_score_to_risk, get_top_features
from app.schemas.response import MLResult, FeatureContribution

logger = logging.getLogger(__name__)


class IsolationForestService:
    """Isolation Forest anomaly detection service"""
    
    @staticmethod
    def analyze(
        vectors_dict: List[Dict],
        feature_names: List[str],
        X_scaled: np.ndarray
    ) -> List[MLResult]:
        """
        Analyze vectors using Isolation Forest.
        
        Args:
            vectors_dict: List of original feature dictionaries
            feature_names: List of feature names used
            X_scaled: Scaled numpy array (n_samples, n_features)
            
        Returns:
            List of MLResult objects
        """
        try:
            logger.info(f"[IF SERVICE] Analyzing {len(vectors_dict)} vectors")
            
            # Fit model on the data first
            isolation_forest_model.fit(X_scaled)
            
            # Get predictions and scores
            predictions = isolation_forest_model.predict(X_scaled)
            scores = isolation_forest_model.score_samples(X_scaled)
            
            # Use scores directly (model wrapper already scales 0-1 with higher = more anomalous)
            anomaly_scores = np.clip(scores, 0, 1)
            
            # Pre-compute max absolute values for each feature to avoid redundant calculations
            max_abs_vals = np.max(np.abs(X_scaled), axis=0)
            
            # Build results
            results = []
            for i, vector_dict in enumerate(vectors_dict):
                entity = vector_dict.get("entity", f"unknown_{i}")
                anomaly_score = float(anomaly_scores[i])
                prediction = int(predictions[i])
                
                # Build feature contributions
                feature_contributions = {}
                for j, feature_name in enumerate(feature_names):
                    feature_contributions[feature_name] = float(X_scaled[i, j])
                
                # Get top features
                top_features = get_top_features(feature_contributions, top_n=5)
                
                # Build top anomalous features list
                top_anomalous_features = []
                for name, value in top_features.items():
                    feature_col = feature_names.index(name)
                    max_abs_val = float(max_abs_vals[feature_col])
                    anomaly_ratio = float(abs(value) / (max_abs_val + 0.001))
                    
                    top_anomalous_features.append(
                        FeatureContribution(
                            feature=name,
                            value=float(value),
                            anomalyRatio=anomaly_ratio
                        )
                    )
                
                # Map to risk
                risk = map_anomaly_score_to_risk(anomaly_score)
                confidence = min(anomaly_score * 1.0, 1.0)
                
                # Build reasons
                reasons = [
                    f"Anomaly score: {anomaly_score:.2%}",
                ]
                if len(top_features) > 0:
                    top_feature_names = ", ".join(list(top_features.keys())[:3])
                    reasons.append(f"Anomalous features: {top_feature_names}")
                
                # Create result
                result = MLResult(
                    entity=entity,
                    anomalyScore=anomaly_score,
                    anomalyDecision=prediction,
                    risk=risk,
                    confidence=confidence,
                    featureContributions=top_features,
                    topAnomalousFeatures=top_anomalous_features,
                    reasons=reasons,
                    detectionMethod="IsolationForest",
                    timestamp=datetime.utcnow().isoformat() + "Z"
                )
                results.append(result)
            
            logger.info(f"[IF SERVICE] Completed analysis: {len(results)} results")
            return results
        
        except Exception as e:
            logger.error(f"[IF SERVICE] Error during analysis: {str(e)}")
            raise


# Create global service instance
isolation_forest_service = IsolationForestService()
