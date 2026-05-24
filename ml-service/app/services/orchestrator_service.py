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
            
            # Convert request vectors to list of dicts
            vectors_dict = request.vectors
            
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
        
        For same entities, aggregate findings (take highest risk).
        
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
                
                # Take highest risk level
                risk_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
                if risk_order.get(dbscan_result.risk, 0) > risk_order.get(existing.risk, 0):
                    # Keep DBSCAN result
                    result_map[dbscan_result.entity] = dbscan_result
                # Otherwise keep IF result
                
                # Combine reasons
                combined_reasons = list(set(existing.reasons + dbscan_result.reasons))
                result_map[dbscan_result.entity].reasons = combined_reasons
                
                # Combine detection method
                result_map[dbscan_result.entity].detectionMethod = "Hybrid"
            else:
                # New entity from DBSCAN
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
