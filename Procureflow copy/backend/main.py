from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_router
from app.core.database import engine
from app.core.database import Base

# Import all models so Base knows about them
import app.models

app = FastAPI(
    title="Procureflow API",
    description="SIH 2026 - Agricultural Procurement Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(api_router)


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "service": "Procureflow API",
        "version": "1.0.0"
    }


@app.get("/")
def root():
    return {
        "service": "Procureflow",
        "tagline": "Reduce Waiting. Improve Transparency. Simplify Procurement.",
        "docs": "/docs",
        "health": "/api/v1/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
