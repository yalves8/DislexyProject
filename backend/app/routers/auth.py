import json
import os
import secrets
import urllib.error
import urllib.parse
import urllib.request

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


class GoogleLoginRequest(BaseModel):
    credential: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


def verify_google_id_token(credential: str) -> dict:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="Login Google nao configurado")

    query = urllib.parse.urlencode({"id_token": credential})
    url = f"https://oauth2.googleapis.com/tokeninfo?{query}"

    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Google invalido")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        raise HTTPException(status_code=502, detail="Nao foi possivel validar o login Google")

    if payload.get("aud") != client_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Google de outro aplicativo")

    email = payload.get("email")
    email_verified = payload.get("email_verified")
    if not email or email_verified not in (True, "true", "True", "1"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Conta Google nao verificada")

    return payload


def issue_token(user: User) -> TokenResponse:
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role, username=user.username)


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

    return issue_token(user)


@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Login com Google",
    description="Valida um ID token do Google, cria a conta se necessário e retorna o JWT do app.",
)
def google_login(body: GoogleLoginRequest, session: Session = Depends(get_session)):
    payload = verify_google_id_token(body.credential)
    username = payload["email"].strip().lower()

    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        user = User(
            username=username,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            role="user",
        )
        session.add(user)
        session.flush()
        session.add(StudentSettings(user_id=user.id))
        session.commit()
        session.refresh(user)
    elif session.get(StudentSettings, user.id) is None:
        session.add(StudentSettings(user_id=user.id))
        session.commit()

    return issue_token(user)
