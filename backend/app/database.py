import os
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

# Caminho absoluto baseado na localização deste arquivo,
# evita criar o banco em diretórios diferentes dependendo de onde o servidor é iniciado.
_BACKEND_DIR = Path(__file__).parent.parent
_DEFAULT_DB = f"sqlite:///{_BACKEND_DIR / 'dilexy.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_DB)

# check_same_thread=False necessário para SQLite com FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables() -> None:
    # Importar models aqui garante que as tabelas sejam registradas no metadata
    import app.models.user  # noqa: F401
    import app.models.activity  # noqa: F401
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
