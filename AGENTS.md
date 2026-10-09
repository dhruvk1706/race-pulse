# Repository Guidelines

## Project Structure & Module Organization

The UI lives in `frontend/`; all data fetching lives in `backend/`, a dependency-light Node/TypeScript service (`cd backend && npm run dev`, port 4000). The frontend proxies `/api/f1/*` to it via Next rewrites.

- `backend/src/` holds `server.ts` (routes), `weekend.ts` and `dashboard.ts` (loaders, normalization, response types), `http.ts` (OpenF1 spacing and 429 retry), and `cache.ts`. Run `npm run typecheck` there too.

- `frontend/src/app/` contains the Next.js App Router page, root layout, metadata, favicon, and global Tailwind styles.
- `frontend/src/components/dashboard/` contains individual dashboard sections and navigation. Shared panels, badges, and dialogs belong in `frontend/src/components/ui/`.
- `frontend/src/lib/f1/` holds only response types and display formatting; they mirror the backend's response types, so update both together. Keep data separate from presentation.
- `frontend/public/images/` contains local placeholder photography; `ASSETS.md` records image provenance and generation prompts.
- `.openai/hosting.json` identifies the private Site. Root `out/` contains ignored deployment output; no test directory exists yet.

## Build, Test, and Development Commands

```sh
cd frontend
npm ci                 # Install dependencies from the lockfile
npm run dev            # Start the dashboard at localhost:3000
npm run typecheck      # Check strict TypeScript types without emitting files
npm run build          # Create and validate a production build
npm start              # Serve the completed production build
npm run build:sites    # Export and stage the static Sites build
```

Development and production builds use webpack. Update `package-lock.json` whenever dependency requirements change.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, double quotes, and semicolons. Name React components in PascalCase and component files in kebab-case, such as `race-hero.tsx`. Use the `@/` alias for imports from `frontend/src/`.

Prefer reusable components, explicit types, and narrowly scoped client state. Add `"use client"` only where browser interactions require it. Extend existing Tailwind theme tokens and CSS variables to preserve the dark palette, red accents, spacing, and typography. No formatter or lint command is configured.

## Testing Guidelines

No automated test framework, `npm test`, or coverage threshold is configured. Run type checking and a production build before submitting changes. Verify the rendered dashboard at desktop and mobile widths, checking overflow, navigation, search, tabs, and dialogs. Include keyboard and Escape-key checks for interactive controls.

If introducing automated tests, document the framework and command. Use `*.test.ts` or `*.test.tsx` for component/module tests and `frontend/tests/*.spec.ts` for browser tests.

## Commit & Pull Request Guidelines

Use concise imperative messages, for example `feat: add championship snapshot` or `fix: prevent mobile timing overflow`.

Keep pull requests focused. Describe the change, link relevant issues, list verification performed, and include desktop/mobile screenshots for visual changes.

## Scope & Configuration

Maintain the real-data scope explicitly requested by the user. Fetch race data from OpenF1, standings from Jolpica, and headlines from BBC Sport. Never restore fictional data or use mock fallback values. Label historical sessions and unavailable sources clearly. Do not add authentication, databases, official racing logos, or unrelated features without explicit direction. Never commit secrets or local environment files.
