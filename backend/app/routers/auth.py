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
    role: str = "user"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Criar conta",
    description="Cria uma nova conta de usuário.",
)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.username == body.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Usuário já existe")

    user = User(username=body.username, password_hash=hash_password(body.password), role="user")
    session.add(user)
    session.flush()

    session.add(StudentSettings(user_id=user.id))

    session.commit()
    return {"message": "Usuário criado com sucesso"}


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login",
    description="Autentica o usuário e retorna um JWT Bearer token. Use o token no header `Authorization: Bearer <token>` para acessar rotas protegidas.",
)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == body.username)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role, username=user.username)
