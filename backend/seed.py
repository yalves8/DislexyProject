"""
Cria usuários iniciais para desenvolvimento e testes.

Uso:
    cd backend
    python seed.py
"""
import sys
import os
from pathlib import Path

# Garante que o .env é carregado antes de qualquer import da app
_here = Path(__file__).parent
sys.path.insert(0, str(_here))

from dotenv import load_dotenv
load_dotenv(_here / ".env")  # backend/.env
load_dotenv(_here.parent / ".env")  # raiz do projeto (fallback)

from sqlmodel import Session, select
import bcrypt
from app.database import engine, create_db_and_tables
from app.models.user import User, StudentSettings, TeacherStudentLink


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

USERS = [
    {"username": "professor", "password": "senha123", "role": "teacher"},
    {"username": "aluno", "password": "senha123", "role": "student"},
]


def seed() -> None:
    create_db_and_tables()

    with Session(engine) as session:
        created: dict[str, User] = {}

        for data in USERS:
            existing = session.exec(
                select(User).where(User.username == data["username"])
            ).first()

            if existing:
                print(f"  [skip] {data['username']} já existe")
                created[data["username"]] = existing
                continue

            user = User(
                username=data["username"],
                password_hash=_hash(data["password"]),
                role=data["role"],
            )
            session.add(user)
            session.flush()  # popula user.id antes de usar como FK
            created[data["username"]] = user
            print(f"  [ok]   {data['username']} criado (role={data['role']})")

        # Configurações padrão do aluno
        if "aluno" in created:
            student = created["aluno"]
            existing_settings = session.get(StudentSettings, student.id)
            if not existing_settings:
                session.add(
                    StudentSettings(
                        user_id=student.id,
                        font_preference="OpenDyslexic",
                        font_size=18,
                        overlay_color="#FFF3CD",
                        ruler_enabled=True,
                    )
                )
                print("  [ok]   Configuracoes de leitura do aluno criadas")

        # Vínculo professor ↔ aluno
        if "professor" in created and "aluno" in created:
            teacher = created["professor"]
            student = created["aluno"]
            existing_link = session.get(
                TeacherStudentLink, (teacher.id, student.id)
            )
            if not existing_link:
                session.add(
                    TeacherStudentLink(
                        teacher_id=teacher.id,
                        student_id=student.id,
                    )
                )
                print("  [ok]   Vinculo professor -> aluno criado")

        session.commit()

    print("\nSeed concluido!")
    print("  username=professor  senha=senha123  role=teacher")
    print("  username=aluno      senha=senha123  role=student")


if __name__ == "__main__":
    seed()
