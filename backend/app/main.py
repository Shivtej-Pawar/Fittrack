from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import create_tables
from app.routers import auth, users, workouts

# Importing the models package registers every model (currently just `User`)
# onto Base.metadata as a side effect of the import. This import must happen
# before create_tables() runs, or SQLAlchemy won't know the `users` table
# exists and won't create it. No routers/endpoints are added here — this is
# purely so table creation on startup works correctly.
import app.models  # noqa: F401


# ---------------------------------------------------------------------------
# Lifespan handler
# ---------------------------------------------------------------------------
# FastAPI's recommended way to run startup/shutdown logic (the older
# @app.on_event("startup") / ("shutdown") decorators are deprecated).
# Code before `yield` runs once when the app starts; code after `yield`
# would run on shutdown (none needed here yet).
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure all tables registered on Base's metadata exist.
    # Now that `User` is defined (app/models/user.py) and imported above,
    # this will create the `users` table on first run.
    create_tables()
    yield
    # Shutdown: nothing to clean up yet.


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Configure CORS so the Vite dev server (localhost:5173) can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://fittrack-[a-z0-9-]+-tricep\.vercel\.app",   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under the existing API_V1_PREFIX (already defined in
# Settings but unused until now). Resulting paths:
#   POST /api/v1/auth/register
#   POST /api/v1/auth/login
#   GET  /api/v1/users/me
#   POST /api/v1/workouts
#   GET  /api/v1/workouts
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(
    workouts.router,
    prefix=settings.API_V1_PREFIX,
)


@app.get("/")
def read_root():
    return {"message": "Welcome to FitTrack API"}
