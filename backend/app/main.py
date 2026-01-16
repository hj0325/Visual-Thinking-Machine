from __future__ import annotations

import os

from fastapi import FastAPI
from dotenv import load_dotenv

from .api import router as api_router


def create_app() -> FastAPI:
    # Load env from repo root `.env.local` (same place Next.js uses),
    # so the user doesn't have to "wire" the backend manually.
    # This is safe: `.env.local` is gitignored.
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    load_dotenv(os.path.join(repo_root, ".env.local"), override=False)
    load_dotenv(os.path.join(repo_root, ".env"), override=False)

    app = FastAPI(title="Thinking Machine Backend", version="0.1.0")
    app.include_router(api_router)

    @app.get("/health")
    async def health() -> dict:
        return {"ok": True}

    return app


app = create_app()

