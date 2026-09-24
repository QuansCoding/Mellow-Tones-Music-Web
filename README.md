# MellowTones

A music streaming web app. Listen to music, upload your own songs, like tracks, follow artists and build playlists.

## Features

- **Streaming player** that keeps playing while you move around the app, with seeking.
- **Home page** ranking the day's trending songs, popular artists and public playlists by real play counts.
- **Discover page** that recommends songs you haven't heard yet.
- **Search** across songs, artists and your own playlists.
- **Your library:** liked songs, favourite artists, and playlists you can make public.
- **Uploads:** add your own MP3, M4A or WAV songs, then edit or delete them.
- **Accounts with email verification:** a 6-digit code is emailed at sign-up, with a human check against bots.

## Tech stack

| Part | Built with |
|---|---|
| Frontend | React 19, Vite, React Router, axios |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic |
| Database | PostgreSQL |
| Auth | JWT tokens, bcrypt password hashing |
| Hosting | Vercel (frontend), Render (API), Neon (database), Supabase Storage (audio) |

## Running it locally

You need Python 3.11+, Node 20+ and a PostgreSQL database.

**1. Backend** (in one terminal):

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/mellowtones
SECRET_KEY=some-long-random-string
```

Then set up the database and start the API:

```bash
alembic upgrade head
fastapi dev app/main.py
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/docs.

**2. Frontend** (in a second terminal):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

Locally you don't need any email, storage or anti-bot accounts. Sign-up codes are printed in the API's terminal instead of emailed, uploaded songs are saved in `backend/uploads/`, and the human check is skipped. Those services are only switched on in production, through environment variables.

## Project layout

```
backend/
  app/            FastAPI app: models, schemas, routers, auth, storage
  alembic/        database migrations
frontend/
  src/            React app: pages, components, the API client (api.js)
```

## License

MIT. See [LICENSE](LICENSE).
