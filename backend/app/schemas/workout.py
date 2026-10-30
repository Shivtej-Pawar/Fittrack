from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SetEntry(BaseModel):

    set: int = Field(ge=1)
    reps: int = Field(ge=0)
    weight: float = Field(ge=0)


class WorkoutCreate(BaseModel):
    category: Literal["Strength", "Cardio", "Core", "Flexibility"]
    muscle_group: str | None = Field(default=None, max_length=50)
    exercise_name: str = Field(min_length=1, max_length=100)
    variation: str | None = Field(default=None, max_length=100)

    set_entries: list[SetEntry] = Field(default_factory=list)

    duration: int | None = Field(default=None, ge=0)

    calories: int | None = Field(default=None, ge=0)

    notes: str | None = Field(default=None, max_length=255)


class WorkoutResponse(BaseModel):
    id: int
    category: str
    muscle_group: str | None = None
    exercise_name: str
    variation: str | None = None
    set_entries: list[SetEntry] = Field(default_factory=list)
    duration: int | None = None
    calories: int | None = None
    notes: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
