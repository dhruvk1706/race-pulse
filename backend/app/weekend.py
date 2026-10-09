import asyncio
import logging
import math
import re
import time
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Literal

from pydantic import BaseModel

from .cache import create_cache
from .openf1 import fetch_openf1

log = logging.getLogger(__name__)

SessionStatus = Literal["upcoming", "live", "completed"]


class WeekendSession(BaseModel):
    sessionKey: int
    meetingKey: int
    name: str
    type: str
    # ISO 8601 UTC timestamps.
    startTime: str
    endTime: str
    status: SessionStatus


class WeekendMeeting(BaseModel):
    meetingKey: int
    name: str
    circuit: str
    location: str
    country: str
    year: int


class WeekendResponse(BaseModel):
    meeting: WeekendMeeting | None
    sessions: list[WeekendSession]
    # Optional: left unset (and omitted from JSON) when no meeting is found.
    meetings: list[WeekendMeeting] | None = None


Row = dict[str, object]
_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
_MS = timedelta(milliseconds=1)


def now_ms() -> float:
    return time.time() * 1000


def parse_ms(value: object) -> float:
    """Date.parse: epoch milliseconds, NaN when unparseable. Accepts ISO 8601 and RFC 2822."""
    if not isinstance(value, str):
        return math.nan
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        try:
            parsed = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return math.nan
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return (parsed - _EPOCH) // _MS


def iso(ms: float) -> str:
    """Date.prototype.toISOString: millisecond precision, Z suffix."""
    ms = int(ms)
    return datetime.fromtimestamp(ms // 1000, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S") + f".{ms % 1000:03d}Z"


def get_session_status(start_time: str, end_time: str, now: float | None = None) -> SessionStatus:
    now = now_ms() if now is None else now
    if now < parse_ms(start_time):
        return "upcoming"
    return "live" if now < parse_ms(end_time) else "completed"


def _record(value: object) -> Row:
    if not isinstance(value, dict):
        raise ValueError("Invalid OpenF1 record")
    return value


def _list(value: object, what: str) -> list:
    if not isinstance(value, list):
        raise ValueError(f"Invalid OpenF1 {what}")
    return value


def _text(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Invalid OpenF1 text")
    return value


def _key(value: object) -> int:
    # Number.isSafeInteger: JSON 5.0 counts as 5.
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not float(value).is_integer() or not 0 < value <= 2**53 - 1:
        raise ValueError("Invalid OpenF1 key")
    return int(value)


def _utc(value: object) -> str:
    timestamp = _text(value)
    # Reject timezone-less dates rather than interpreting them in the server's timezone.
    if not re.search(r"(Z|[+-]\d{2}:\d{2})\Z", timestamp, re.I) or math.isnan(parse_ms(timestamp)):
        raise ValueError("Invalid OpenF1 timestamp")
    return iso(parse_ms(timestamp))


def _is_race(meeting: Row) -> bool:
    name = meeting.get("meeting_name")
    return meeting.get("is_cancelled") is not True and isinstance(name, str) and re.search("Grand Prix", name, re.I) is not None


def _normalize_meeting(value: object) -> WeekendMeeting:
    meeting = _record(value)
    return WeekendMeeting(
        meetingKey=_key(meeting.get("meeting_key")),
        name=_text(meeting.get("meeting_name")),
        circuit=_text(meeting.get("circuit_short_name")),
        location=_text(meeting.get("location")),
        country=_text(meeting.get("country_name")),
        year=_key(meeting.get("year")),
    )


def select_race_meeting(values: object, now: float | None = None) -> WeekendMeeting | None:
    now = now_ms() if now is None else now
    races = []
    for meeting in map(_record, _list(values, "meetings")):
        # Validate every timestamp, not just races', as the Node backend did.
        start, end = parse_ms(_utc(meeting.get("date_start"))), parse_ms(_utc(meeting.get("date_end")))
        if _is_race(meeting) and end >= start:
            races.append((meeting, start, end))

    # Keep an event on screen through its final session, then move to the next race.
    active = sorted((r for r in races if r[1] <= now <= r[2]), key=lambda r: r[1])
    upcoming = sorted((r for r in races if r[1] > now), key=lambda r: r[1])
    previous = sorted((r for r in races if r[2] < now), key=lambda r: r[2], reverse=True)
    chosen = (active or upcoming or previous or [None])[0]
    return _normalize_meeting(chosen[0]) if chosen else None


def normalize_sessions(value: object, meeting_key: int, now: float | None = None) -> list[WeekendSession]:
    sessions = []
    for item in _list(value, "sessions"):
        session = _record(item)
        start_time = _utc(session.get("date_start"))
        end_time = _utc(session.get("date_end"))
        if _key(session.get("meeting_key")) != meeting_key or parse_ms(end_time) < parse_ms(start_time):
            raise ValueError("Inconsistent OpenF1 session")
        sessions.append(WeekendSession(
            sessionKey=_key(session.get("session_key")),
            meetingKey=meeting_key,
            name=_text(session.get("session_name")),
            type=_text(session.get("session_type")),
            startTime=start_time,
            endTime=end_time,
            status=get_session_status(start_time, end_time, now),
        ))
    return sorted(sessions, key=lambda s: parse_ms(s.startTime))


async def _load_base() -> WeekendResponse:
    year = datetime.now(timezone.utc).year

    async def previous_season() -> object:
        try:
            return await fetch_openf1(f"meetings?year={year - 1}")
        except Exception:
            return []

    meetings, previous = await asyncio.gather(fetch_openf1(f"meetings?year={year}"), previous_season())
    current = [_record(item) for item in _list(meetings, "meetings")]
    calendar = [
        _normalize_meeting(item)
        for item in sorted(
            [item for item in [*(map(_record, previous) if isinstance(previous, list) else []), *current] if _is_race(item)],
            key=lambda item: parse_ms(item.get("date_start")),
        )
    ]

    meeting = select_race_meeting(current)
    # During the winter break, prefer the next season if its calendar is available.
    upcoming = any(_is_race(item) and isinstance(item.get("date_end"), str) and parse_ms(item["date_end"]) >= now_ms() for item in current)
    if meeting and not upcoming:
        try:
            meeting = select_race_meeting(await fetch_openf1(f"meetings?year={year + 1}")) or meeting
        except Exception:
            log.warning("Next season schedule unavailable", exc_info=True)
    if not meeting:
        return WeekendResponse(meeting=None, sessions=[])
    sessions = normalize_sessions(await fetch_openf1(f"sessions?meeting_key={meeting.meetingKey}"), meeting.meetingKey)
    in_calendar = any(item.meetingKey == meeting.meetingKey for item in calendar)
    return WeekendResponse(meeting=meeting, sessions=sessions, meetings=calendar if in_calendar else [*calendar, meeting])


_base_cache = create_cache(5 * 60)
_sessions_cache = create_cache(5 * 60)


async def load_weekend(meeting_key: int | None = None) -> WeekendResponse | None:
    """Returns None when meeting_key is not on the calendar."""
    base: WeekendResponse = await _base_cache("base", _load_base)
    result = base
    if meeting_key is not None and meeting_key != (base.meeting.meetingKey if base.meeting else None):
        meeting = next((item for item in base.meetings or [] if item.meetingKey == meeting_key), None)
        if not meeting:
            return None

        async def load_sessions() -> list[WeekendSession]:
            return normalize_sessions(await fetch_openf1(f"sessions?meeting_key={meeting_key}"), meeting_key)

        sessions = await _sessions_cache(str(meeting_key), load_sessions)
        result = base.model_copy(update={"meeting": meeting, "sessions": sessions})
    # Cached sessions keep their fetch-time status; recompute against the clock.
    return result.model_copy(update={"sessions": [
        session.model_copy(update={"status": get_session_status(session.startTime, session.endTime)}) for session in result.sessions
    ]})
