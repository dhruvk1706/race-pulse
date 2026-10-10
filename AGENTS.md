# Repository Guidelines

## Project Structure & Module Organization

The UI lives in `frontend/`; all data fetching lives in `backend/`, a FastAPI service on Python 3.11 (port 4000). The frontend proxies `/api/f1/*` to it via Next rewrites.

- `backend/app/` holds `main.py` (routes), `weekend.py` and `dashboard.py` (loaders, normalization, Pydantic response models), `strategy.py` and `track.py` (race replay), `ask.py` (Gemini on Vertex AI Q&A with rate limit and daily cap), `openf1.py` (HTTP, OpenF1 spacing and 429 retry), and `cache.py`. Tests live in `backend/tests/`; `backend/Dockerfile` serves it on port 4000 as a non-root user.

- `frontend/src/app/` contains the Next.js App Router page, root layout, metadata, favicon, and global Tailwind styles.
- `frontend/src/components/dashboard/` contains individual dashboard sections and navigation. Shared panels, badges, and dialogs belong in `frontend/src/components/ui/`.
- `frontend/src/lib/f1/` holds only response types and display formatting; they mirror the backend's Pydantic models (camelCase fields), so update both together. Keep data separate from presentation.
- `frontend/public/images/` contains local placeholder photography; `ASSETS.md` records image provenance and generation prompts.

## Build, Test, and Development Commands

```sh
cd frontend
npm ci                 # Install dependencies from the lockfile
npm run dev            # Start the dashboard at localhost:3000
npm run typecheck      # Check strict TypeScript types without emitting files
npm run build          # Create and validate a production build
npm start              # Serve the completed production build
```

```sh
cd backend
python -m venv .venv   # Python 3.11; activate with .venv/bin/activate (Windows: .venv\Scripts\activate)
pip install -r requirements-dev.txt   # runtime deps + pytest
uvicorn app.main:app --reload --host 127.0.0.1 --port 4000
python -m pytest       # Backend unit tests
docker build -t race-pulse-backend .   # Container serving 0.0.0.0:4000
```

`POST /api/f1/ask` calls Gemini on Vertex AI with Application Default Credentials (`gcloud auth application-default login` locally, the attached service account on GCP). Never put keys in code or env files. `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (default `global`), `GEMINI_MODEL` (default `gemini-2.5-flash`) and `ASK_DAILY_CAP` (default 30) configure it.

Development and production builds use webpack. Update `package-lock.json` whenever dependency requirements change.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, double quotes, and semicolons. Name React components in PascalCase and component files in kebab-case, such as `race-hero.tsx`. Use the `@/` alias for imports from `frontend/src/`.

Prefer reusable components, explicit types, and narrowly scoped client state. Add `"use client"` only where browser interactions require it. Extend existing Tailwind theme tokens and CSS variables to preserve the dark palette, red accents, spacing, and typography. No formatter or lint command is configured.

## Testing Guidelines

The backend uses pytest (`cd backend && python -m pytest`, files named `tests/test_*.py`); the frontend has no test framework, `npm test`, or coverage threshold. Run `python -m pytest`, frontend type checking, and a production build before submitting changes. Verify the rendered dashboard at desktop and mobile widths, checking overflow, navigation, search, tabs, and dialogs. Include keyboard and Escape-key checks for interactive controls.

If introducing automated tests, document the framework and command. Use `*.test.ts` or `*.test.tsx` for component/module tests and `frontend/tests/*.spec.ts` for browser tests.

## Commit & Pull Request Guidelines

Use concise imperative messages, for example `feat: add championship snapshot` or `fix: prevent mobile timing overflow`.

Keep pull requests focused. Describe the change, link relevant issues, list verification performed, and include desktop/mobile screenshots for visual changes.

## Scope & Configuration

Maintain the real-data scope explicitly requested by the user. Fetch race data from OpenF1, standings from Jolpica, and headlines from BBC Sport. Never restore fictional data or use mock fallback values. Label historical sessions and unavailable sources clearly. Do not add authentication, databases, official racing logos, or unrelated features without explicit direction. Never commit secrets or local environment files.

<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance

- Where these AWS rules conflict with the project's own instructions, the
  project's instructions take precedence.
- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
<!-- END AWS Agent Toolkit rules -->
