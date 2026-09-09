from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import songs, auth, library

# Schema is owned by Alembic — run `alembic upgrade head`.
#
# Base.metadata.create_all() used to live here. It only ever CREATEs missing
# tables and never ALTERs existing ones, so it silently diverges from the
# models the moment a column changes. Leaving it in alongside migrations is
# worse still: it creates tables behind Alembic's back.

app = FastAPI(title="Quan's Music API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # the Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(songs.router)
app.include_router(auth.router)
app.include_router(library.router)
