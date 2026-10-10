import asyncio
import json
import logging
import os
import time
from collections import deque
from datetime import datetime, timezone
from functools import cache

from google import genai
from google.auth.exceptions import GoogleAuthError
from google.genai import errors, types
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .cache import create_cache
from .dashboard import _news
from .strategy import NotRaceSession, load_strategy

log = logging.getLogger(__name__)

# Vertex AI auth comes from Application Default Credentials (`gcloud auth application-default login` locally,
# the attached service account on GCP). GOOGLE_CLOUD_PROJECT picks the project; GOOGLE_CLOUD_LOCATION defaults to global.
MODEL_ID = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
DAILY_CAP = int(os.environ.get("ASK_DAILY_CAP", "30"))
MAX_QUESTION = 500
PER_MINUTE = 5
MAX_TOKENS = 400

SYSTEM = (
    "You are a Formula 1 race strategist answering questions about one completed race, as it stood at a given lap. "
    "Answer only from the race data below: the strategy model's output for that lap (positions, gaps in seconds, "
    "tyre age, fitted degradation in s/lap, pit windows, pit loss, safety car state, alerts) and recent news headlines. "
    "If the data does not answer the question, say you don't know from this data. Do not use outside knowledge or "
    "invent numbers. Use driver codes as given. Answer in at most 120 words of plain text, no markdown."
)


class AskRequest(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", str_strip_whitespace=True)
    question: str = Field(min_length=1, max_length=MAX_QUESTION)
    sessionKey: int = Field(gt=0)
    lap: int = Field(gt=0)


class AskResponse(BaseModel):
    answer: str


class AskError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


# ponytail: in-memory and per process, so N tasks/workers allow N x the limits; move to DynamoDB when scaled out.
_recent: dict[str, deque[float]] = {}
_day = {"date": "", "count": 0}


def _rate_limit(ip: str) -> None:
    now = time.monotonic()
    if len(_recent) > 1000:  # forget idle clients so the map stays small
        for key in [key for key, hits in _recent.items() if now - hits[-1] >= 60]:
            del _recent[key]
    hits = _recent.setdefault(ip, deque())
    while hits and now - hits[0] >= 60:
        hits.popleft()
    if len(hits) >= PER_MINUTE:
        raise AskError(429, f"Too many questions: the limit is {PER_MINUTE} a minute. Wait a moment and try again.")
    hits.append(now)


def _spend_daily() -> None:
    today = datetime.now(timezone.utc).date().isoformat()
    if _day["date"] != today:
        _day.update(date=today, count=0)
    if _day["count"] >= DAILY_CAP:
        raise AskError(429, f"The strategist has answered its {DAILY_CAP} questions for today. Try again tomorrow (UTC).")
    _day["count"] += 1


@cache
def _client():
    return genai.Client(
        vertexai=True,
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
        http_options=types.HttpOptions(timeout=30_000, retry_options=types.HttpRetryOptions(attempts=3)),
    )


def _generate(question: str, data: str) -> str:
    response = _client().models.generate_content(
        model=MODEL_ID,
        contents=question,
        config=types.GenerateContentConfig(
            system_instruction=[SYSTEM, f"<race_data>\n{data}\n</race_data>"],
            max_output_tokens=MAX_TOKENS,
            # Thinking would spend the small token budget before the answer.
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )
    usage, candidate = response.usage_metadata, (response.candidates or [None])[0]
    stop = candidate.finish_reason.name if candidate and candidate.finish_reason else None
    log.info("ask: model=%s input_tokens=%s output_tokens=%s stop=%s", MODEL_ID, usage and usage.prompt_token_count, usage and usage.candidates_token_count, stop)
    text = (response.text or "").strip()
    if not text:
        raise ValueError(f"Empty answer (stop reason {stop})")
    return text + (" …" if stop == "MAX_TOKENS" else "")


_news_cache = create_cache(600)


async def _headlines() -> list[str]:
    try:
        return [story.title for story in await _news_cache("bbc", _news)]
    except Exception:
        log.warning("ask: headlines unavailable", exc_info=True)
        return []


async def answer(body: bytes, ip: str) -> AskResponse:
    try:
        request = AskRequest.model_validate_json(body)
    except ValidationError as error:
        if any(item["loc"] == ("question",) for item in error.errors()):
            raise AskError(400, f"Ask a question of 1 to {MAX_QUESTION} characters.") from None
        raise AskError(400, "Invalid request") from None
    _rate_limit(ip)
    try:
        strategy = await load_strategy(request.sessionKey, request.lap)
    except NotRaceSession:
        raise AskError(400, "The strategist only covers race and sprint sessions.") from None
    if strategy is None:
        raise AskError(404, "Strategy data not found")
    # The per-lap fit points are chart data; the slopes and windows carry the strategy.
    data = json.dumps({
        "strategy": strategy.model_dump(mode="json", exclude={"drivers": {"__all__": {"stints": {"__all__": {"laps"}}}}}),
        "headlines": await _headlines(),
    }, separators=(",", ":"))
    _spend_daily()
    try:
        text = await asyncio.to_thread(_generate, request.question, data)
    except (errors.APIError, GoogleAuthError, ValueError):
        log.exception("ask: Gemini call failed")
        raise AskError(502, "The strategist is unavailable right now. Try again later.") from None
    return AskResponse(answer=text)
