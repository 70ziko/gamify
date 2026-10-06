from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai.router import router as ai_router
from app.config import get_settings
from app.errors import install_error_handlers
from app.marketplace.router import router as marketplace_router
from app.profiles.router import router as profiles_router
from app.progress.router import router as progress_router
from app.roadmaps.router import router as roadmaps_router


def create_app() -> FastAPI:
    app = FastAPI(title="Gamify API", version="0.1.0")
    install_error_handlers(app)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    for router in (profiles_router, progress_router, roadmaps_router, marketplace_router, ai_router):
        app.include_router(router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "env": get_settings().environment}

    return app


app = create_app()
