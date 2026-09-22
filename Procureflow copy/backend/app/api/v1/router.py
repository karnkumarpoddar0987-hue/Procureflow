from fastapi import APIRouter
from app.api.v1 import auth, farmer, operator, officer, admin

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(farmer.router)
api_router.include_router(operator.router)
api_router.include_router(officer.router)
api_router.include_router(admin.router)
