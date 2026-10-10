import logging
import math

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException

from .ask import AskError, answer
from .dashboard import load_dashboard
from .strategy import NotRaceSession, load_strategy
from .track import load_track
from .weekend import load_weekend

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Loopback in dev: the Next.js server proxies to it, browsers never call it directly.
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, redirect_slashes=False)


def send(status: int, body: object) -> JSONResponse:
    if isinstance(body, BaseModel):
        # exclude_unset drops optional fields never assigned, e.g. WeekendResponse.meetings.
        body = body.model_dump(mode="json", exclude_unset=True)
    return JSONResponse(body, status, headers={"Cache-Control": "no-store"})


def positive_int(request: Request, name: str) -> int | None | str:
    values = request.query_params.getlist(name)
    if not values:
        return None
    try:
        # Number(): surrounding whitespace allowed, "5.0" is 5.
        number = float(values[0].strip() or "0") if "_" not in values[0] else math.nan
    except ValueError:
        return "invalid"
    return int(number) if number.is_integer() and 0 < number <= 2**53 - 1 else "invalid"


ASK_PATH = "/api/f1/ask"


@app.middleware("http")
async def guard(request: Request, call_next):
    if request.method != ("POST" if request.url.path == ASK_PATH else "GET"):
        return send(405, {"error": "Method not allowed"})
    try:
        return await call_next(request)
    except Exception:
        log.exception("%s failed:", request.url.path)
        return send(502, {"error": "Race data unavailable"})


@app.exception_handler(HTTPException)
async def not_found(request: Request, exc: HTTPException) -> JSONResponse:
    return send(404, {"error": "Not found"})


@app.get("/api/f1/weekend")
async def weekend(request: Request) -> JSONResponse:
    meeting_key = positive_int(request, "meetingKey")
    if meeting_key == "invalid":
        return send(400, {"error": "Invalid meeting key"})
    data = await load_weekend(meeting_key)
    return send(200, data) if data else send(404, {"error": "Race not found"})


@app.get("/api/f1/track")
async def track(request: Request) -> JSONResponse:
    session_key, lap = positive_int(request, "sessionKey"), positive_int(request, "lap")
    if not isinstance(session_key, int):
        return send(400, {"error": "Invalid session key"})
    if lap == "invalid":
        return send(400, {"error": "Invalid lap"})
    data = await load_track(session_key, lap)
    return send(200, data) if data else send(404, {"error": "Track data not found"})


@app.get("/api/f1/dashboard")
async def dashboard(request: Request) -> JSONResponse:
    session_key = positive_int(request, "sessionKey")
    if session_key == "invalid":
        return send(400, {"error": "Invalid session key"})
    return send(200, await load_dashboard(session_key))


@app.get("/api/f1/strategy")
async def strategy(request: Request) -> JSONResponse:
    session_key, lap = positive_int(request, "sessionKey"), positive_int(request, "lap")
    if not isinstance(session_key, int):
        return send(400, {"error": "Invalid session key"})
    if lap == "invalid":
        return send(400, {"error": "Invalid lap"})
    try:
        data = await load_strategy(session_key, lap)
    except NotRaceSession:
        return send(400, {"error": "Strategy is only available for race and sprint sessions"})
    return send(200, data) if data else send(404, {"error": "Strategy data not found"})


def client_ip(request: Request) -> str:
    # ponytail: the first X-Forwarded-For hop is client-supplied, so the per-IP limit is best effort;
    # the daily cap is the hard cost ceiling. Trust only the edge proxy's hop once hosting is fixed.
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


@app.post(ASK_PATH)
async def ask(request: Request) -> JSONResponse:
    body = await request.body()
    if len(body) > 4096:
        return send(400, {"error": "Request too large"})
    try:
        return send(200, await answer(body, client_ip(request)))
    except AskError as error:
        return send(error.status, {"error": error.message})
