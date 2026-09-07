from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .router import songs, auth
from . import models  # import so Base knows about the tables

Base.metadata.create_all(bind=engine)   # dev only — see note below

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






