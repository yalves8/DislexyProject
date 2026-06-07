from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_session
from app.models.user import User, StudentSettings

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str  # "student" | "teacher"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    if body.role not in ("student", "teacher"):
        raise HTTPException(status_code=400, detail="role deve ser 'student' ou 'teacher'")

    existing = session.exec(select(User).where(User.username == body.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Usuario ja existe")

    user = User(username=body.username, password_hash=hash_password(body.password), role=body.role)
    session.add(user)
    session.flush()

    if body.role == "student":
        session.add(StudentSettings(user_id=user.id))

    session.commit()
    return {"message": "Usuario criado com sucesso"}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == body.username)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role, username=user.username)
