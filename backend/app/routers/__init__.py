"""
Routers package.

Re-exports the router objects so main.py can do
`from app.routers import auth, users` and call
`app.include_router(auth.router)` / `app.include_router(users.router)`.
"""

from app.routers import auth, users, workouts

__all__ = ["auth", "users", "workouts"]
