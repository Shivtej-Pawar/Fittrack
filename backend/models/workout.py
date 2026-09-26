from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.database import Base


class Workout(Base):

    __tablename__ = "workouts"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )

    category: Mapped[str] = mapped_column(String(50), nullable=False)

    muscle_group: Mapped[str | None] = mapped_column(String(50), nullable=True)

    exercise_name: Mapped[str] = mapped_column(String(100), nullable=False)

    variation: Mapped[str | None] = mapped_column(String(100), nullable=True)

    set_entries: Mapped[list[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )

    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)

    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)

    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="workouts")
