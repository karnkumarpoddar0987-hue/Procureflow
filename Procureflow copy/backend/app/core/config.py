from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    SECRET_KEY: str = "procureflow-sih-2026-super-secret-jwt-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./procureflow.db"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
