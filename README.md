# Race Pulse

A reference-led motorsport dashboard built with Next.js App Router, TypeScript, Tailwind CSS 4, and Lucide icons.

The app is contained in `frontend/`; repository guidance lives in the root `AGENTS.md`.

## Run locally

```sh
cd frontend
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

```sh
npm run typecheck
npm run build
```

## Structure

- `frontend/src/app/`: page, app layout, global theme, and responsive styling.
- `frontend/src/components/dashboard/`: reusable dashboard sections and navigation.
- `frontend/src/components/ui/`: shared panels, status badges, and accessible native dialogs.
- `frontend/src/data/dashboard.ts`: all typed mock race, driver, news, championship, session, and weather data.
- `frontend/public/images/`: local, generated, unbranded placeholder photography.

All race data, times, and article copy are fictional snapshots reproducing the supplied reference. Search, session tabs, driver/team standings, timing details, news, and schedule views operate entirely in the browser. Settings is reserved for future implementation. There are no APIs, authentication, database connections, or live integrations.

The desktop layout follows the reference's sidebar, shallow hero, two card rows, and conditions footer. At intermediate widths the cards wrap; on mobile the sidebar becomes a drawer and timing scrolls within its card.

## Sites hosting

The repository is registered with ChatGPT Sites through `.openai/hosting.json`.

Run `npm run build:sites` inside `frontend/` to produce a static export and stage it in the ignored repository-root `out/` directory. The Sites workflow pushes the source, packages this output, and publishes the saved version. The normal `dev`, `build`, and `start` commands retain the standard Next.js workflow.

Keep the existing Site identity when publishing updates. The Site starts private.
