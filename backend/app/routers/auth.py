
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.services.auth_service import hash_password, verify_password
from app.services.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        height=user_in.height,
        current_weight=user_in.current_weight,
        goal_weight=user_in.goal_weight,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token)
async def login(request: Request, db: Session = Depends(get_db)) -> Token:
    invalid_credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        # Existing frontend contract — unchanged.
        body = await request.json()
        credentials = UserLogin(**body)
        email = credentials.email
        password = credentials.password
    else:
     
        form = await request.form()
        form_data = OAuth2PasswordRequestForm(
            username=form.get("username", ""),
            password=form.get("password", ""),
        )
        email = form_data.username
        password = form_data.password

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise invalid_credentials_exception

    if not verify_password(password, user.hashed_password):
        raise invalid_credentials_exception

    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token)
