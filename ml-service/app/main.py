"""
FastAPI application entry point for ML service.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

logger = logging.getLogger(__name__)

# Import routes (after logging setup)
from app.api import health, analysis

# Create FastAPI app
app = FastAPI(
    title="SentinelX ML Service",
    description="ML analysis service for SentinelX IDS",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(analysis.router, tags=["analysis"])

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("[STARTUP] SentinelX ML Service starting")
    logger.info("[STARTUP] Available routes:")
    logger.info("[STARTUP]   - GET /health")
    logger.info("[STARTUP]   - POST /analyze")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("[SHUTDOWN] SentinelX ML Service shutting down")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SentinelX ML Service",
        "version": "1.0.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
