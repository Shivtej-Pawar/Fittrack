from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.models.workout import Workout
from app.schemas.workout import WorkoutCreate, WorkoutResponse
from app.services.security import get_current_user

router = APIRouter(prefix="/workouts", tags=["Workouts"])


def _get_owned_workout_or_404(
    workout_id: int, current_user: User, db: Session
) -> Workout:
    workout = db.query(Workout).filter(Workout.id == workout_id).first()

    if workout is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found"
        )

    if workout.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this workout",
        )

    return workout


@router.post("", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
def create_workout(
    workout_in: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Workout:
 
    new_workout = Workout(
        user_id=current_user.id,
        category=workout_in.category,
        muscle_group=workout_in.muscle_group,
        exercise_name=workout_in.exercise_name,
        variation=workout_in.variation,
   
        set_entries=[entry.model_dump() for entry in workout_in.set_entries],
        duration=workout_in.duration,
        calories=workout_in.calories,
        notes=workout_in.notes,
    )

    db.add(new_workout)
    db.commit()
    db.refresh(new_workout)

    return new_workout


@router.get("", response_model=list[WorkoutResponse])
def list_workouts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Workout]:
   
    return (
        db.query(Workout)
        .filter(Workout.user_id == current_user.id)
        .order_by(Workout.created_at.desc())
        .all()
    )


@router.put("/{workout_id}", response_model=WorkoutResponse)
def update_workout(
    workout_id: int,
    workout_in: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Workout:
    workout = _get_owned_workout_or_404(workout_id, current_user, db)

    workout.category = workout_in.category
    workout.muscle_group = workout_in.muscle_group
    workout.exercise_name = workout_in.exercise_name
    workout.variation = workout_in.variation
    workout.set_entries = [entry.model_dump() for entry in workout_in.set_entries]
    workout.duration = workout_in.duration
    workout.calories = workout_in.calories
    workout.notes = workout_in.notes

    db.commit()
    db.refresh(workout)

    return workout


@router.delete("/{workout_id}")
def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    workout = _get_owned_workout_or_404(workout_id, current_user, db)

    db.delete(workout)
    db.commit()

    return {"message": "Workout deleted successfully"}
