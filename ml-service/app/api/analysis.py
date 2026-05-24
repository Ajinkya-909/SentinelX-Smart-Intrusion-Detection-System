"""
Analysis routes for ML service.
Exposes the /analyze endpoint.
"""

from fastapi import APIRouter, HTTPException
import logging

from app.schemas.request import AnalysisRequest
from app.schemas.response import AnalysisResponse
from app.services.orchestrator_service import orchestrator_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest) -> AnalysisResponse:
    """
    Main ML analysis endpoint.
    
    Receives feature vectors and runs both Isolation Forest and DBSCAN
    to detect anomalies.
    
    Args:
        request: AnalysisRequest with vectors and optional modelConfig
        
    Returns:
        AnalysisResponse with results, statistics, and analysis metadata
    """
    try:
        logger.info(f"[ANALYSIS] Received request with {len(request.vectors)} vectors")
        
        # Validate request
        if not request.vectors:
            raise ValueError("vectors cannot be empty")
        
        # Orchestrate analysis
        response = orchestrator_service.orchestrate(request)
        
        logger.info(f"[ANALYSIS] Response ready with {len(response.results)} results")
        return response
    
    except ValueError as e:
        logger.error(f"[ANALYSIS] Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"[ANALYSIS] Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
