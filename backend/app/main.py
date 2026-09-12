import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import songs, auth, library, search, discover

# Schema is owned by Alembic — run `alembic upgrade head`.
#
# Base.metadata.create_all() used to live here. It only ever CREATEs missing
# tables and never ALTERs existing ones, so it silently diverges from the
# models the moment a column changes. Leaving it in alongside migrations is
# worse still: it creates tables behind Alembic's back.

# Send this app's own log lines (cleanup counts, storage failures) to the
# host's log. uvicorn configures only its own loggers, so without this the
# app's INFO lines would never be printed.
logging.basicConfig(level=logging.INFO,
                    format="%(levelname)s:%(name)s:%(message)s")

app = FastAPI(title="Quan's Music API")

# Comma-separated list (ex. "https://mellowtones.vercel.app,http://localhost:5173").
# Defaults to the Vite dev server (http, not https), so local dev needs no setup.
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Cheap endpoint for host's health check"""
    return {"status":"ok"}

app.include_router(songs.router)
app.include_router(auth.router)
app.include_router(library.router)
app.include_router(search.router)
app.include_router(discover.router)
