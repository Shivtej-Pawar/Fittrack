"""
Shared pytest fixtures for the backend test suite (post-launch audit,
Phase 13/14 of that audit).

--- Why SQLite, when production uses PostgreSQL? --------------------------
This project's `.env`-based config requires a real `DATABASE_URL` with no
default (see app/core/config.py) — there's deliberately no built-in way
to run the app against anything but a real Postgres/Neon database. That's
the right call for the *app itself*, but it means these tests need their
own throwaway database that doesn't require a live Postgres server to be
running in whatever environment runs `pytest` (a laptop, CI, this
sandbox, etc.).

A local SQLite file fills that role here. This only works because
`app/models/workout.py`'s `set_entries` column was changed (see that
file's own comment) from a hardcoded Postgres-only `JSONB` type to
`JSON().with_variant(JSONB, "postgresql")` — which still compiles to the
exact same JSONB column in real Postgres, but also works on SQLite. Every
other column in the schema was already dialect-portable. No other
production code had to change to make this possible.

Environment variables are set *before* anything under `app` is imported
(pytest imports conftest.py, and runs its module-level code, before it
collects/imports the actual test files in this directory) — `app.core.
config.Settings()` reads `DATABASE_URL`/`JWT_SECRET_KEY` etc. from the
environment at import time, so this ordering matters.
"""

import os
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_fittrack.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    """
    A single TestClient for the whole test session. Using it as a
    context manager (`with TestClient(app) as client`) triggers
    app.main's `lifespan` handler, which calls `create_tables()` — so the
    SQLite test database gets its schema created exactly the same way
    the real app creates it on startup, rather than a separate/parallel
    "test setup" that could drift from what production actually does.
    """
    with TestClient(app) as test_client:
        yield test_client


def unique_email():
    """
    A fresh, never-before-used email for each test that needs to
    register a user. Tests share one SQLite file for the whole session
    (see `client` above) rather than resetting the database between
    tests, so using a unique email per test avoids one test's leftover
    data (e.g. "user already registered") from affecting another's —
    without needing per-test transaction rollback machinery for what's
    meant to be a lightweight, readable test suite.
    """
    return f"test-{uuid.uuid4().hex[:12]}@example.com"


@pytest.fixture
def registered_user(client):
    """
    Registers a fresh user and returns
    `(user_response_dict, auth_headers)` — the most common starting
    point for tests that need an authenticated request. `auth_headers`
    is ready to pass straight into `client.get(..., headers=auth_headers)`.
    """
    email = unique_email()
    password = "TestPass123"

    register_response = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Test User", "email": email, "password": password},
    )
    assert register_response.status_code == 201, register_response.text
    user = register_response.json()

    login_response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert login_response.status_code == 200, login_response.text
    token = login_response.json()["access_token"]

    return user, {"Authorization": f"Bearer {token}"}
