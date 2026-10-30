"""
Database setup for FitTrack.

This module is the single source of truth for how the app talks to its
database. It wires together:
    - the SQLAlchemy engine (the actual connection to Neon PostgreSQL)
    - SessionLocal (a factory that produces per-request DB sessions)
    - Base (the class every future ORM model will inherit from)
    - get_db() (a FastAPI dependency that hands a session to path
      operations and guarantees it gets closed afterwards)
    - create_tables() (creates tables from any models registered on Base)

No models are defined here — this file only sets up the *plumbing*.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
# The engine manages the actual connection(s) to the database. The URL comes
# from Settings (app/core/config.py), which in turn reads it from the .env
# file — so switching databases only ever means changing that env var, not
# this code. `settings.DATABASE_URL` is expected to be a Neon PostgreSQL
# connection string (e.g. "postgresql+psycopg2://user:pass@host/dbname
# ?sslmode=require") supplied by you in `.env` — nothing is hardcoded here.
#
# `pool_pre_ping=True` makes the engine test each pooled connection with a
# lightweight "SELECT 1" before handing it out. This matters for Neon
# specifically: Neon can silently close idle connections (e.g. when a
# serverless compute suspends), and without pre-ping a stale connection
# would surface as a confusing runtime error on the next query instead of
# being transparently replaced.
#
# Note: SQLite's `connect_args={"check_same_thread": False}` has been
# removed — that flag is SQLite-specific and does not apply to (and would
# be rejected by) the PostgreSQL driver.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)

# ---------------------------------------------------------------------------
# SessionLocal
# ---------------------------------------------------------------------------
# SessionLocal is a *factory* (not a session itself). Calling SessionLocal()
# creates a new Session object bound to the engine above. We create one
# instance per request (see get_db()) rather than reusing a single global
# session, so requests don't share state or leak data between each other.
#
#   autocommit=False -> we control commits explicitly in our code/services.
#   autoflush=False  -> SQLAlchemy won't flush pending changes to the DB
#                       before every query; we flush/commit intentionally.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------
# Base is the declarative base class. Every ORM model (currently just
# `User` — see app/models/user.py) inherits from this Base, which is how
# SQLAlchemy discovers what tables exist and how to map Python classes to
# SQL tables, regardless of which database engine is behind it.
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# get_db() — FastAPI dependency
# ---------------------------------------------------------------------------
# This is a generator function used with FastAPI's dependency injection
# system (`Depends(get_db)`). For each incoming request that needs DB
# access, FastAPI will:
#   1. Call get_db(), which opens a new Session and `yield`s it.
#   2. Run the path operation with that session injected as an argument.
#   3. Once the path operation finishes (successfully or with an error),
#      execution resumes after the `yield` and the `finally` block closes
#      the session — guaranteeing connections are always released.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# create_tables()
# ---------------------------------------------------------------------------
# Creates all tables that have been registered on Base's metadata (currently
# `users`, from the `User` model) directly on Neon PostgreSQL. Unchanged
# from the SQLite version — `Base.metadata.create_all()` is database-agnostic
# and works the same way regardless of which engine it's bound to. Intended
# to be called once at application startup (see app/main.py's lifespan
# handler).
def create_tables():
    Base.metadata.create_all(bind=engine)
