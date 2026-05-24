from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "ml-service",
        "message": "Ready to analyze."
    }