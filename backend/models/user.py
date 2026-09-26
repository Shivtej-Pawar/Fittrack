from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.database import Base



if TYPE_CHECKING:    
    from models.workout import Workout 


class User(Base):
    """Represents a single registered FitTrack user."""

    __tablename__ = "users"

 
    id: Mapped[int] = mapped_column(primary_key=True)

    full_name: Mapped[str] = mapped_column(String(100), nullable=False)

    
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )


    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

 
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    goal_weight: Mapped[float | None] = mapped_column(Float, nullable=True)


    weekly_goal: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5, server_default="5"
    )


    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


    workouts: Mapped[list["Workout"]] = relationship(
        "Workout", back_populates="user"
    )
