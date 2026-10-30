"""
Models package.

SQLAlchemy only registers a model's table on `Base.metadata` once its module
has actually been imported somewhere. Importing `User` here means that a
single `import app.models` (which main.py triggers indirectly — see below)
is enough to make `create_tables()` aware of every model in this package,
without every consumer needing to know the individual file names.
"""

from app.models.user import User
from app.models.workout import Workout

__all__ = ["User", "Workout"]
