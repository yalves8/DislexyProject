import sys
import os

# Adiciona backend/ ao path para que os imports `from app.xxx` funcionem
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from app.main import app  # noqa: F401  — Vercel detecta o objeto `app`
