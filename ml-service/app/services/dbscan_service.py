"""
DBSCAN ML service.
Handles anomaly detection using DBSCAN clustering.
"""

import numpy as np
from typing import List, Dict
from datetime import datetime
import logging

from app.models.dbscan_model import dbscan_model
from app.utils.risk_mapper import map_anomaly_score_to_risk, get_top_features
from app.schemas.response import MLResult, FeatureContribution

logger = logging.getLogger(__name__)


class DBSCANService:
    """DBSCAN anomaly detection service"""
    
    @staticmethod
    def analyze(
        vectors_dict: List[Dict],
        feature_names: List[str],
        X_scaled: np.ndarray
    ) -> List[MLResult]:
        """
        Analyze vectors using DBSCAN clustering.
        
        Args:
            vectors_dict: List of original feature dictionaries
            feature_names: List of feature names used
            X_scaled: Scaled numpy array (n_samples, n_features)
            
        Returns:
            List of MLResult objects
        """
        try:
            logger.info(f"[DBSCAN SERVICE] Analyzing {len(vectors_dict)} vectors")
            
            # Get cluster labels
            labels = dbscan_model.predict(X_scaled)
            
            # Get anomaly scores
            anomaly_scores = dbscan_model.get_anomaly_scores(X_scaled, labels)
            
            # Pre-compute max absolute values for each feature
            max_abs_vals = np.max(np.abs(X_scaled), axis=0) if X_scaled.shape[0] > 0 else []
            
            # Build results
            results = []
            for i, vector_dict in enumerate(vectors_dict):
                entity = vector_dict.get("entity", f"unknown_{i}")
                anomaly_score = float(anomaly_scores[i])
                label = int(labels[i])
                prediction = -1 if label == -1 else 1  # -1 for anomaly, 1 for normal
                
                # Build feature contributions
                feature_contributions = {}
                for j, feature_name in enumerate(feature_names):
                    feature_contributions[feature_name] = float(X_scaled[i, j])
                
                # Get top features
                top_features = get_top_features(feature_contributions, top_n=5)
                
                # Build top anomalous features list
                top_anomalous_features = []
                if X_scaled.shape[0] > 1:
                    for name, value in top_features.items():
                        feature_col = feature_names.index(name)
                        max_abs_val = float(max_abs_vals[feature_col])
                        anomaly_ratio = float(abs(value) / (max_abs_val + 0.001))
                        
                        top_anomalous_features.append(
                            FeatureContribution(
                                feature=name,
                                value=value,
                                anomalyRatio=min(anomaly_ratio, 1.0)
                            )
                        )
                
                # Map to risk
                risk = map_anomaly_score_to_risk(anomaly_score)
                confidence = min(anomaly_score * 1.0, 1.0)
                
                # Build reasons
                reasons = []
                if label == -1:
                    reasons.append("Point identified as outlier/noise in clustering")
                else:
                    reasons.append(f"Point in cluster {label}")
                
                reasons.append(f"Anomaly score: {anomaly_score:.2%}")
                
                if len(top_features) > 0:
                    top_feature_names = ", ".join(list(top_features.keys())[:2])
                    reasons.append(f"Top anomalous features: {top_feature_names}")
                
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
                    detectionMethod="DBSCAN",
                    timestamp=datetime.utcnow().isoformat() + "Z"
                )
                results.append(result)
            
            logger.info(f"[DBSCAN SERVICE] Completed analysis: {len(results)} results")
            return results
        
        except Exception as e:
            logger.error(f"[DBSCAN SERVICE] Error during analysis: {str(e)}")
            raise


# Create global service instance
dbscan_service = DBSCANService()
