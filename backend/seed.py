"""
Cria usuário inicial para desenvolvimento e testes.

Uso:
    cd backend
    python seed.py
"""
import sys
from pathlib import Path

_here = Path(__file__).parent
sys.path.insert(0, str(_here))

from dotenv import load_dotenv
load_dotenv(_here / ".env")
load_dotenv(_here.parent / ".env")

import bcrypt
from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models.user import User, StudentSettings


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def seed() -> None:
    create_db_and_tables()

    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == "usuario")).first()

        if existing:
            print("  [skip] usuario já existe")
            user = existing
        else:
            user = User(username="usuario", password_hash=_hash("senha123"))
            session.add(user)
            session.flush()
            print("  [ok]   usuario criado")

        if not session.get(StudentSettings, user.id):
            session.add(StudentSettings(user_id=user.id))
            print("  [ok]   configurações de leitura criadas")

        session.commit()

    print("\nSeed concluído!")
    print("  username=usuario  senha=senha123")


if __name__ == "__main__":
    seed()
