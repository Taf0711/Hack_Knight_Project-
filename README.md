# Greenwash Detector

AI-powered sustainability-report auditor. Upload a PDF, and the app extracts every environmental claim, grounds each one in the source text with hybrid RAG retrieval, and returns a traffic-light verdict with click-through citations into the original PDF.

**Stack:** Next.js 14 + MUI · FastAPI · PostgreSQL + pgvector · Gemini 2.5 Flash

---

## Prerequisites

- **Docker + Docker Compose** (recommended) — or Node 20+ and Python 3.11+ for local dev
- **Gemini API key** — https://aistudio.google.com/apikey

---

## Quick start (Docker — recommended for the demo)

From the project root:

```bash
# 1. Drop your Gemini key into .env
cp .env.example .env
# then edit .env and replace GEMINI_API_KEY=your_gemini_api_key_here

# 2. Bring the full stack up (Postgres + FastAPI + Next.js)
docker-compose up --build

# Or detached:
docker-compose up --build -d
```

Once the three containers are healthy, open:

- **App:** http://localhost:3000
- **API:** http://localhost:8000
- **API docs (Swagger):** http://localhost:8000/docs

### Makefile shortcuts

```bash
make start       # docker-compose up --build -d
make logs        # tail all three services
make stop        # docker-compose down
make reset       # wipe database + uploads (containers stay up)
make clean       # remove containers + volumes
```

---

## Local dev (no Docker)

Run the three services in three terminals:

### 1. Postgres (pgvector)

```bash
docker run -d --name greenwash_db \
  -e POSTGRES_USER=greenwash \
  -e POSTGRES_PASSWORD=greenwash123 \
  -e POSTGRES_DB=greenwash_db \
  -p 5432:5432 \
  -v "$PWD/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql" \
  pgvector/pgvector:pg16
```

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://greenwash:greenwash123@localhost:5432/greenwash_db
export GEMINI_API_KEY=<your key>

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

The frontend reads `frontend/.env.local`, which should contain:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:3000
PYTHON_API_URL=http://localhost:8000
```

---

## Demo flow (for the recruiter)

1. Open http://localhost:3000.
2. Drag a sustainability-report PDF onto the upload zone (or click to browse).
3. The app uploads, chunks, and embeds the PDF, then auto-kicks off analysis — takes ~1–2 min for a full report.
4. On the results page:
   - **Verdict summary** shows the overall traffic-light rating plus claim counts.
   - **Claims tab** — expand any claim to see dimension scores, reasoning steps, and citations. **Click a citation** to open the PDF inline, jumped to that exact page.
   - **Document Structure tab** — browse the detected sections and extraction batches; click any row to jump to the corresponding page in the PDF viewer.
5. **Actions → Reanalyze Claims** re-runs the AI pipeline atomically (old claims are preserved if the new run fails).

---

## Resetting between demos

```bash
# Keep services running, wipe all documents + claims
make reset

# Or hit the admin endpoint directly
curl -X POST http://localhost:8000/api/admin/reset
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `GEMINI_API_KEY` errors on analyze | Make sure `.env` has a real key, then `docker-compose restart python-api` |
| Port 3000 / 8000 / 5432 already in use | `lsof -nP -iTCP:3000 -sTCP:LISTEN` then kill the other process, or stop the conflicting container |
| Frontend can't reach backend | Confirm `frontend/.env.local` has `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` and restart `npm run dev` |
| Database looks stale | `make reset` to truncate all tables and clear uploads |

Full docs live under `docs/` — start with `docs/PROJECT_DOCS_INDEX.md`.
