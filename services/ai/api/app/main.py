"""
AI Compute Management API

FastAPI service for managing AWS Spot GPU instances for LLM testing.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import instances_router, pricing_router, credentials_router, quotas_router, models_router, connections_router, docker_router, stacks_router

# Create FastAPI app
app = FastAPI(
    title="AI Compute Management API",
    description="API for managing AWS Spot GPU instances for LLM testing",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(instances_router, prefix="/api")
app.include_router(pricing_router, prefix="/api")
app.include_router(credentials_router, prefix="/api")
app.include_router(quotas_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(connections_router, prefix="/api")
app.include_router(docker_router, prefix="/api")
app.include_router(stacks_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Compute Management API",
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
