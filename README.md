# Race Pulse

A reference-led motorsport dashboard built with Next.js App Router, TypeScript, Tailwind CSS 4, and Lucide icons.

The UI lives in `frontend/` and all data fetching in `backend/`; repository guidance lives in the root `AGENTS.md`.

## Run locally

Run the backend and the frontend in two terminals:

```sh
cd backend
npm install
npm run dev      # http://127.0.0.1:4000 (PORT to change)
```

```sh
cd frontend
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

Run `npm run typecheck` in each folder, plus `npm run build` in `frontend/`. The frontend proxies `/api/f1/*` to the backend; set `BACKEND_URL` if it is not on `http://127.0.0.1:4000`.

## Structure

- `frontend/src/app/`: page, app layout, global theme, and responsive styling.
- `frontend/src/components/dashboard/`: reusable dashboard sections and navigation.
- `frontend/src/components/ui/`: shared panels, status badges, and accessible native dialogs.
- `frontend/src/lib/f1/`: response types and display formatting only.
- `backend/src/`: `server.ts` (HTTP routes), `weekend.ts` and `dashboard.ts` (OpenF1 schedules and sessions, Jolpica standings, BBC Sport headlines), `http.ts` (OpenF1 rate-limit spacing and retry), `cache.ts` (TTL cache that serves the last good data when a refresh fails).
- `frontend/public/images/`: local, generated, unbranded placeholder photography.

Race schedules, completed-session classification, race-control messages, and recorded weather are fetched from OpenF1. Championship standings come from Jolpica; news headlines link to the original BBC Sport articles. Data refreshes every minute and on window focus. Source failures show explicit unavailable states, with no fictional fallback. The next race schedule and the latest completed session are separate, labelled contexts. Best-lap times are shown for practice/qualifying; race results do not provide best-lap data and show a dash. OpenF1 live telemetry requires a paid subscription, so live car positions are unavailable in this setup. No credentials or authentication are configured.

The desktop layout follows the reference's sidebar, shallow hero, two card rows, and conditions footer. At intermediate widths the cards wrap; on mobile the sidebar becomes a drawer and timing scrolls within its card.

## Sites hosting

The repository is registered with ChatGPT Sites through `.openai/hosting.json`.

The real-data routes require running servers: `npm run build` and `npm start` in `frontend/`, and `npm start` in `backend/`. The legacy `build:sites` static-export command cannot host these server routes. Do not publish the old static `out/` directory as an update to this version.

Keep the existing Site identity when publishing updates. The Site starts private.
