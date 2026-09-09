# Backend

FastAPI + SQLAlchemy + PostgreSQL.

## Setup

```bash
cd backend
python -m venv venv
venv/Scripts/activate        # Windows;  source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/mellowtones
SECRET_KEY=<a long random string>
```

## Database schema

The schema is owned by **Alembic**, not by `create_all`. After pulling changes,
or on a fresh database:

```bash
alembic upgrade head
```

`Base.metadata.create_all()` used to run on startup. It was removed: it only
ever CREATEs missing tables and never ALTERs existing ones, so it silently
diverged from the models the moment a column changed — and left alongside
migrations it created tables behind Alembic's back.

Bringing an existing database (created by the old `create_all`) under Alembic:

```bash
alembic stamp 0001_baseline   # "this DB already looks like the baseline"
alembic upgrade head
```

Making a schema change: edit `app/models.py`, then

```bash
alembic revision --autogenerate -m "what changed"
# read the generated file before running it — autogenerate does not detect
# renames, and never writes the data migration you may also need
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --reload
```

Interactive API docs at http://localhost:8000/docs.

## Migrations in this repo

| Revision | What it does |
| --- | --- |
| `0001_baseline` | `users` and `songs` as they existed before Alembic. |
| `0002_artists_and_library` | Normalises `songs.artist` (free text) into an `artists` table, backfilling and deduping existing rows; adds `liked_songs`, `favorite_artists`, `playlists`, `playlist_songs`. |

Both directions are tested — `alembic downgrade 0001_baseline` rebuilds the
free-text `artist` column from the relationship without losing data.
