import logging
import math

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException

from .dashboard import load_dashboard
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


@app.middleware("http")
async def guard(request: Request, call_next):
    if request.method != "GET":
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


@app.get("/api/f1/dashboard")
async def dashboard(request: Request) -> JSONResponse:
    session_key = positive_int(request, "sessionKey")
    if session_key == "invalid":
        return send(400, {"error": "Invalid session key"})
    return send(200, await load_dashboard(session_key))
