from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide settings.
    Values are loaded from environment variables, falling back to the
    defaults below if not set. In development, they are read from the
    `.env` file in the backend/ root (see `model_config` below).
    """

    PROJECT_NAME: str = "FitTrack API"
    API_V1_PREFIX: str = "/api/v1"

    # Allowed origins for CORS (frontend dev server)
    CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "https://fittrack-tricep.vercel.app",  # replace with your real Vercel domain
]

    # Database connection string — must be a PostgreSQL/Neon URL, e.g.
    # postgresql+psycopg2://user:password@host/dbname?sslmode=require
    # No default/fallback is provided on purpose: the real value always
    # comes from the `DATABASE_URL` variable in `.env` (never hardcoded or
    # invented here). If `.env` doesn't set it, startup will fail loudly
    # with a clear "field required" error instead of silently connecting
    # to the wrong database.
    DATABASE_URL: str

    # --- JWT settings -----------------------------------------------------
    # Secret key used to sign/verify JWTs. Deliberately has NO default —
    # a real secret must always come from `.env`. This is the same pattern
    # already used for DATABASE_URL: fail loudly at startup rather than
    # silently running with a guessable/shared secret.
    JWT_SECRET_KEY: str

    # Signing algorithm for JWTs. HS256 (HMAC + SHA-256) is the standard
    # choice for a single-server setup using a shared secret key.
    JWT_ALGORITHM: str = "HS256"

    # How long an access token stays valid before the user must log in
    # again. 30 minutes is a reasonable default for development.
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Pydantic v2 style settings config (replaces the old inner `class Config`).
    # Tells pydantic-settings to read values from a `.env` file if present,
    # in addition to real environment variables (which always take priority).
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
