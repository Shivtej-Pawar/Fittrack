"""
Schemas package.

Re-exports schema classes so other modules can do
`from app.schemas import UserCreate` instead of reaching into
`app.schemas.user` directly. Unlike models/__init__.py, this import has no
side effect on the database — it's purely a convenience.
"""

from app.schemas.token import Token
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.schemas.workout import SetEntry, WorkoutCreate, WorkoutResponse

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "Token",
    "SetEntry",
    "WorkoutCreate",
    "WorkoutResponse",
]
