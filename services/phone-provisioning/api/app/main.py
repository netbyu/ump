"""
SIP Phone Provisioning API
Auto-provision SIP phones with zero-touch deployment
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routes.provisioning import router as provisioning_router

# Create FastAPI app
app = FastAPI(
    title="SIP Phone Provisioning API",
    description="Auto-provision SIP phones with config generation",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(provisioning_router, prefix="/api")

# Serve config files via HTTP
config_dir = os.environ.get("PHONE_CONFIG_DIR", "/var/lib/phone-configs")
if os.path.exists(config_dir):
    app.mount("/configs", StaticFiles(directory=config_dir), name="configs")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SIP Phone Provisioning API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
