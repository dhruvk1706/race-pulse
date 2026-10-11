# Race Pulse

A reference-led motorsport dashboard built with Next.js App Router, TypeScript, Tailwind CSS 4, and Lucide icons.

The UI lives in `frontend/` and all data fetching in `backend/`; repository guidance lives in the root `AGENTS.md`.

## Run locally

Run the backend and the frontend in two terminals:

```sh
cd backend
python -m venv .venv          # Python 3.11
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 4000
```

On Windows (PowerShell), from `backend/`, without activating the venv:

```sh
.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 4000
```

The app is the `app` package (`backend/app/main.py`), so start it through uvicorn as above; `python main.py` or `python app/main.py` will not work. Check it is up at [127.0.0.1:4000/api/f1/weekend](http://127.0.0.1:4000/api/f1/weekend).

```sh
cd frontend
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

Run `python -m pytest` in `backend/`, and `npm run typecheck` plus `npm run build` in `frontend/`. The frontend proxies `/api/f1/*` to the backend; set `BACKEND_URL` if it is not on `http://127.0.0.1:4000`.

## Structure

- `frontend/src/app/`: page, app layout, global theme, and responsive styling.
- `frontend/src/components/dashboard/`: reusable dashboard sections and navigation.
- `frontend/src/components/ui/`: shared panels, status badges, and accessible native dialogs.
- `frontend/src/lib/f1/`: response types and display formatting only.
- `backend/app/`: FastAPI service. `main.py` (HTTP routes), `weekend.py` and `dashboard.py` (OpenF1 schedules and sessions, Jolpica standings, BBC Sport headlines), `openf1.py` (OpenF1 rate-limit spacing and retry), `cache.py` (TTL cache that serves the last good data when a refresh fails). `backend/Dockerfile` runs it on port 4000.
- `frontend/public/images/`: local, generated, unbranded placeholder photography.

Race schedules, completed-session classification, race-control messages, and recorded weather are fetched from OpenF1. Championship standings come from Jolpica; news headlines link to the original BBC Sport articles. Data refreshes every minute and on window focus. Source failures show explicit unavailable states, with no fictional fallback. The next race schedule and the latest completed session are separate, labelled contexts. Best-lap times are shown for practice/qualifying; race results do not provide best-lap data and show a dash. OpenF1 live telemetry requires a paid subscription, so live car positions are unavailable in this setup. The app has no user authentication, and no credentials are stored in the repository.

The desktop layout follows the reference's sidebar, shallow hero, two card rows, and conditions footer. At intermediate widths the cards wrap; on mobile the sidebar becomes a drawer and timing scrolls within its card.

## Ask the strategist

`POST /api/f1/ask` answers a question about a completed race or sprint at the scrubber's lap, using Gemini on Google Vertex AI with only that lap's strategy output and recent headlines as context. Locally it uses Application Default Credentials (`gcloud auth application-default login`); on GCP it uses the attached service account. No keys are stored in the repository.

- `GOOGLE_CLOUD_PROJECT`: GCP project with the Vertex AI API enabled (`race-pulse-445625019`). `GOOGLE_CLOUD_LOCATION` defaults to `global`.
- `GEMINI_MODEL`: default `gemini-2.5-flash`.
- `ASK_DAILY_CAP`: questions answered per UTC day, default 30. Each IP is also limited to 5 questions a minute, and answers are capped at about 400 output tokens.

## Deploying the backend (Cloud Run)

```bash
gcloud run deploy race-pulse-backend --project=race-pulse-445625019 --region=asia-south1 --source=backend   --port=4000 --allow-unauthenticated --max-instances=2 --memory=1Gi --set-env-vars=GOOGLE_CLOUD_PROJECT=race-pulse-445625019,CACHE_BUCKET=race-pulse-cache-445625019
```

The default compute service account holds `roles/aiplatform.user`, so Vertex needs no keys. It also holds `roles/storage.objectAdmin` on the private `CACHE_BUCKET` bucket, where the dashboard and weekend responses are saved so a cold instance can still serve them while OpenF1 blocks anonymous access during live sessions. Without `CACHE_BUCKET` (local dev) nothing is persisted. Point the frontend at the service with `BACKEND_URL=https://race-pulse-backend-179488902237.asia-south1.run.app`. The ask rate limit and daily cap are per instance.
