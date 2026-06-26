from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from app.database import create_db_and_tables
from app.routers import auth, students, pdfs

FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="DilexyProject API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(pdfs.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve frontend static files if the build exists
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Serve existing static files (icons, manifest, sw.js, etc.)
        requested = FRONTEND_DIST / full_path
        if requested.is_file():
            return FileResponse(requested)
        # Fallback to index.html for React Router routes
        return FileResponse(FRONTEND_DIST / "index.html")
