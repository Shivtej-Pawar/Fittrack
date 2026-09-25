from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
   

    PROJECT_NAME: str = "FitTrack API"
    API_V1_PREFIX: str = "/api/v1"

   
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]


    DATABASE_URL: str

    
    JWT_SECRET_KEY: str

   
    JWT_ALGORITHM: str = "HS256"


    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
