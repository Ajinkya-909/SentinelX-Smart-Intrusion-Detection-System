"""
Orchestrator service for ML analysis.
Coordinates Isolation Forest and DBSCAN execution.
"""

import uuid
import logging
from typing import List, Dict, Tuple
from datetime import datetime
import numpy as np

from app.schemas.request import AnalysisRequest
from app.schemas.response import MLResult, AnalysisResponse, AnalysisStats
from app.services.preprocessing_service import preprocessing_service
from app.services.isolation_forest_service import isolation_forest_service
from app.services.dbscan_service import dbscan_service
from app.utils.vector_utils import extract_feature_values, get_numeric_features, handle_nan_inf
from app.utils.validators import validate_feature_vectors, validate_model_config
from app.config.settings import (
    ISOLATION_FOREST_ENABLED,
    DBSCAN_ENABLED,
    SCALING_METHOD,
    FILL_NAN_VALUE,
    FILL_INF_VALUE
)

logger = logging.getLogger(__name__)


class OrchestratorService:
    """Main orchestrator for ML analysis"""
    
    @staticmethod
    def orchestrate(request: AnalysisRequest) -> AnalysisResponse:
        """
        Orchestrate ML analysis by running both Isolation Forest and DBSCAN.
        
        Args:
            request: AnalysisRequest with vectors and modelConfig
            
        Returns:
            AnalysisResponse with results from both models
        """
        analysis_id = str(uuid.uuid4())
        
        try:
            logger.info(f"[ORCHESTRATOR] Starting analysis {analysis_id}")
            
            # Convert request vectors to list of dicts (from Pydantic objects)
            vectors_dict = [v.model_dump() for v in request.vectors]
            
            # Validate input
            if not validate_feature_vectors(vectors_dict):
                raise ValueError("Invalid feature vectors")
            
            # Get numeric features from first vector
            numeric_features = get_numeric_features(vectors_dict[0])
            if not numeric_features:
                raise ValueError("No numeric features found in vectors")
            
            logger.info(f"[ORCHESTRATOR] Found {len(numeric_features)} numeric features")
            
            # Extract feature values as numpy array
            X, entities = extract_feature_values(vectors_dict, numeric_features)
            logger.info(f"[ORCHESTRATOR] Extracted array shape: {X.shape}")
            
            # Handle NaN/Inf values
            X = handle_nan_inf(X, fill_value=FILL_NAN_VALUE)
            
            # Scale features
            logger.info(f"[ORCHESTRATOR] Scaling features with {SCALING_METHOD}")
            X_scaled = preprocessing_service.fit_transform(X)
            
            # Run both models
            results = []
            
            if ISOLATION_FOREST_ENABLED:
                logger.info("[ORCHESTRATOR] Running Isolation Forest")
                if_results = isolation_forest_service.analyze(vectors_dict, numeric_features, X_scaled)
                results.extend(if_results)
                logger.info(f"[ORCHESTRATOR] IF produced {len(if_results)} results")
            
            if DBSCAN_ENABLED:
                logger.info("[ORCHESTRATOR] Running DBSCAN")
                dbscan_results = dbscan_service.analyze(vectors_dict, numeric_features, X_scaled)
                # Merge DBSCAN results with existing (aggregate from both models)
                results = OrchestratorService._merge_results(results, dbscan_results)
                logger.info(f"[ORCHESTRATOR] DBSCAN produced {len(dbscan_results)} results")
            
            # Apply heuristic boosts for known intrusion patterns, especially useful for small batch sizes
            for r in results:
                # Find the matching input vector
                matching_vector = next((v for v in vectors_dict if v.get("entity") == r.entity), None)
                if matching_vector:
                    total_boost = 0.0
                    boost_reasons = []
                    
                    # 1. Brute Force Heuristic
                    failed_logins = matching_vector.get("failedLoginAttempts")
                    if failed_logins is not None and failed_logins >= 20:
                        total_boost += 0.15
                        boost_reasons.append(f"High number of failed login attempts ({int(failed_logins)})")
                        
                    # 2. High Request Velocity
                    req_vel = matching_vector.get("requestVelocity") or matching_vector.get("requestsPerSecond") or matching_vector.get("requestsPerMinute")
                    if req_vel is not None:
                        # Normalize requestsPerMinute to per-second approx for check
                        if matching_vector.get("requestsPerMinute") is not None and req_vel >= 600:
                            total_boost += 0.15
                            boost_reasons.append(f"Extreme request velocity ({int(req_vel)}/min)")
                        elif req_vel >= 50:
                            total_boost += 0.15
                            boost_reasons.append(f"Extreme request velocity ({int(req_vel)}/sec)")
                            
                    # 3. High Error Rate
                    err_rate = matching_vector.get("errorRate")
                    if err_rate is not None and err_rate >= 0.7:
                        total_boost += 0.10
                        boost_reasons.append(f"High error rate ({err_rate:.1%})")
                        
                    # 4. Large Data Exfiltration
                    data_trans = matching_vector.get("totalDataTransferred") or matching_vector.get("dataTransferred")
                    if data_trans is not None and data_trans >= 500000000: # 500 MB
                        total_boost += 0.15
                        boost_reasons.append(f"Massive data transfer volume ({data_trans / (1024**3):.2f} GB)")
                        
                    # 5. Concurrent Session Anomalies
                    conn_sess = matching_vector.get("concurrentSessions")
                    if conn_sess is not None and conn_sess >= 3:
                        total_boost += 0.10
                        boost_reasons.append(f"Multiple concurrent sessions ({int(conn_sess)})")
                        
                    if total_boost > 0.0:
                        new_score = min(r.anomalyScore + total_boost, 1.0)
                        r.anomalyScore = new_score
                        if new_score >= 0.5:
                            r.anomalyDecision = -1
                        # Re-map risk and confidence
                        from app.utils.risk_mapper import map_anomaly_score_to_risk
                        r.risk = map_anomaly_score_to_risk(new_score)
                        r.confidence = max(r.confidence, new_score)
                        # Add heuristic reasons to the list
                        r.reasons = list(set(r.reasons + boost_reasons))

            # Calculate statistics
            stats = OrchestratorService._calculate_statistics(results)
            
            # Build response
            response = AnalysisResponse(
                status="success",
                model="Hybrid" if (ISOLATION_FOREST_ENABLED and DBSCAN_ENABLED) else "IsolationForest" if ISOLATION_FOREST_ENABLED else "DBSCAN",
                analysisId=analysis_id,
                timestamp=datetime.utcnow().isoformat() + "Z",
                vectorsProcessed=len(vectors_dict),
                results=results,
                statistics=stats
            )
            
            logger.info(f"[ORCHESTRATOR] Analysis {analysis_id} completed successfully")
            return response
        
        except Exception as e:
            logger.error(f"[ORCHESTRATOR] Error in analysis {analysis_id}: {str(e)}")
            return AnalysisResponse(
                status="error",
                model="Hybrid",
                analysisId=analysis_id,
                timestamp=datetime.utcnow().isoformat() + "Z",
                vectorsProcessed=len(request.vectors) if request.vectors else 0,
                results=[],
                error=str(e)
            )
    
    @staticmethod
    def _merge_results(if_results: List[MLResult], dbscan_results: List[MLResult]) -> List[MLResult]:
        """
        Merge results from Isolation Forest and DBSCAN.
        
        For same entities, aggregate findings using weighted consensus (70% IF, 30% DBSCAN).
        
        Args:
            if_results: Isolation Forest results
            dbscan_results: DBSCAN results
            
        Returns:
            Merged list of results
        """
        # Create a map for easier merging
        result_map = {}
        
        # Add IF results
        for result in if_results:
            result_map[result.entity] = result
        
        # Merge with DBSCAN results
        for dbscan_result in dbscan_results:
            if dbscan_result.entity in result_map:
                # Entity already has IF result
                existing = result_map[dbscan_result.entity]
                
                # Weighted consensus: 70% IF score, 30% DBSCAN score
                fused_score = (existing.anomalyScore * 0.7) + (dbscan_result.anomalyScore * 0.3)
                existing.anomalyScore = fused_score
                
                # Re-evaluate decision based on fused score
                existing.anomalyDecision = -1 if fused_score >= 0.5 else 1
                
                # Re-map risk and confidence
                from app.utils.risk_mapper import map_anomaly_score_to_risk
                existing.risk = map_anomaly_score_to_risk(fused_score)
                existing.confidence = max(existing.confidence, fused_score)
                
                # Combine reasons
                combined_reasons = list(set(existing.reasons + dbscan_result.reasons))
                existing.reasons = combined_reasons
                
                # Combine detection method
                existing.detectionMethod = "Hybrid"
            else:
                # New entity from DBSCAN
                # If IF is active but this entity was only evaluated by DBSCAN, scale DBSCAN's score
                from app.utils.risk_mapper import map_anomaly_score_to_risk
                if ISOLATION_FOREST_ENABLED:
                    fused_score = dbscan_result.anomalyScore * 0.3
                    dbscan_result.anomalyScore = fused_score
                    dbscan_result.anomalyDecision = -1 if fused_score >= 0.5 else 1
                    dbscan_result.risk = map_anomaly_score_to_risk(fused_score)
                result_map[dbscan_result.entity] = dbscan_result
        
        return list(result_map.values())
    
    @staticmethod
    def _calculate_statistics(results: List[MLResult]) -> AnalysisStats:
        """
        Calculate statistics from results.
        
        Args:
            results: List of MLResult objects
            
        Returns:
            AnalysisStats object
        """
        if not results:
            return AnalysisStats(
                totalVectors=0,
                anomaliesDetected=0,
                criticalCount=0,
                highCount=0,
                mediumCount=0,
                lowCount=0,
                avgAnomalyScore=0.0
            )
        
        risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        anomaly_count = 0
        total_score = 0.0
        
        for result in results:
            risk_counts[result.risk] += 1
            total_score += result.anomalyScore
            
            if result.anomalyDecision == -1:
                anomaly_count += 1
        
        avg_score = total_score / len(results) if results else 0.0
        
        return AnalysisStats(
            totalVectors=len(results),
            anomaliesDetected=anomaly_count,
            criticalCount=risk_counts["CRITICAL"],
            highCount=risk_counts["HIGH"],
            mediumCount=risk_counts["MEDIUM"],
            lowCount=risk_counts["LOW"],
            avgAnomalyScore=round(avg_score, 4)
        )


# Create global orchestrator instance
orchestrator_service = OrchestratorService()
