from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):

    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    height: float | None = None
    current_weight: float | None = None
    goal_weight: float | None = None


class UserLogin(BaseModel):
 

    email: EmailStr
    password: str


class UserResponse(BaseModel):
 
    id: int
    full_name: str
    email: EmailStr
    height: float | None = None
    current_weight: float | None = None
    goal_weight: float | None = None
    weekly_goal: int = 5
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    height: float | None = None
    current_weight: float | None = None
    goal_weight: float | None = None
    weekly_goal: int | None = Field(default=None, ge=1, le=7)
