import asyncio
import logging
import math
import re
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel

from .cache import create_cache
from .openf1 import fetch_ok, fetch_openf1
from .weekend import iso, now_ms, parse_ms

log = logging.getLogger(__name__)

# int | float keeps whole numbers as JSON integers, like JavaScript.
Num = int | float


class TimingEntry(BaseModel):
    position: Num
    driver: str
    fullName: str
    team: str
    teamColor: str
    gap: str
    bestLap: str
    laps: Num | None
    status: str


class Standing(BaseModel):
    # Field order matches the Node backend's JSON key order.
    name: str
    points: Num
    position: Num
    color: str


class NewsStory(BaseModel):
    title: str
    url: str
    publishedAt: str


class RaceControlMessage(BaseModel):
    date: str
    message: str
    category: str


class Weather(BaseModel):
    date: str
    air: Num | None
    track: Num | None
    humidity: Num | None
    wind: Num | None
    rainfall: Num | None


class SessionSnapshot(BaseModel):
    name: str
    circuit: str
    date: str
    sessionKey: Num
    timing: list[TimingEntry]
    messages: list[RaceControlMessage]
    weather: Weather | None
    errors: list[str]


class DashboardResponse(BaseModel):
    fetchedAt: str
    snapshot: SessionSnapshot | None
    drivers: list[Standing]
    teams: list[Standing]
    standingsSeason: str | None
    standingsRound: str | None
    news: list[NewsStory]
    errors: list[str]


Row = dict[str, object]


def _object(value: object) -> Row:
    if not isinstance(value, dict):
        raise ValueError("Invalid data record")
    return value


def _rows(value: object) -> list[Row]:
    if not isinstance(value, list):
        raise ValueError("Invalid data list")
    return [_object(item) for item in value]


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _number(value: object) -> Num | None:
    if not _is_number(value) or not math.isfinite(value):
        return None
    # JSON.stringify writes 33.0 as 33.
    return int(value) if isinstance(value, float) and value.is_integer() else value


def _js_number(value: object) -> float:
    """Number(value) for the numeric strings Jolpica returns; NaN otherwise."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return math.nan
    return int(number) if number.is_integer() else number


def _js_str(value: object) -> str:
    """String(value) for the JSON scalars these feeds return."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _fixed3(value: float) -> str:
    # Number.prototype.toFixed rounds exact ties away from zero; Python's format rounds half-even.
    return str(Decimal(value).quantize(Decimal("0.001"), ROUND_HALF_UP))


def _coalesce(value: object, fallback: object) -> object:
    """value ?? fallback"""
    return fallback if value is None else value


def _color(value: object) -> str:
    return f"#{value}" if isinstance(value, str) and re.fullmatch(r"[a-f\d]{6}", value, re.I) else "#aab0ba"


async def _openf1(resource: str) -> list[Row]:
    return _rows(await fetch_openf1(resource))


def _lap(value: object) -> str:
    times = [item for item in (value if isinstance(value, list) else [value]) if _is_number(item) and item > 0]
    if not times:
        return "—"
    milliseconds = math.floor(min(times) * 1000 + 0.5)
    return f"{milliseconds // 60_000}:{_fixed3(milliseconds % 60_000 / 1000).zfill(6)}"


def _gap(value: object) -> str:
    values = [item for item in (value if isinstance(value, list) else [value]) if item is not None]
    last = values[-1] if values else None
    if _is_number(last):
        return "—" if last == 0 else f"+{_fixed3(last)}"
    return last if isinstance(last, str) else "—"


def _latest_finished(sessions: list[Row]) -> Row | None:
    now = now_ms()
    finished = [item for item in sessions if item.get("is_cancelled") is not True and parse_ms(_js_str(item.get("date_end"))) < now]
    return max(finished, key=lambda item: parse_ms(_js_str(item.get("date_end"))), default=None)


def _newest_first(item: Row) -> float:
    date = parse_ms(_js_str(item.get("date")))
    return -math.inf if math.isnan(date) else date


async def _settled(*aws) -> list:
    return await asyncio.gather(*aws, return_exceptions=True)


async def _snapshot(requested_key: int | None) -> SessionSnapshot | None:
    year = datetime.now(timezone.utc).year
    # Completed sessions only: historical data must never be labelled live.
    session = _latest_finished(await _openf1(f"sessions?session_key={requested_key}" if requested_key else f"sessions?year={year}"))
    if not session and not requested_key:
        session = _latest_finished(await _openf1(f"sessions?year={year - 1}"))
    if not session:
        return None
    session_key = _number(session.get("session_key"))
    if not session_key:
        raise ValueError("Invalid session key")
    query = f"session_key={_js_str(session_key)}"
    results, driver_rows, control, weather_rows = await _settled(
        _openf1(f"session_result?{query}"), _openf1(f"drivers?{query}"), _openf1(f"race_control?{query}"), _openf1(f"weather?{query}"),
    )

    def value(result: object) -> list[Row]:
        return [] if isinstance(result, BaseException) else result

    errors: list[str] = []
    if isinstance(results, BaseException) or isinstance(driver_rows, BaseException):
        errors.append("Session results unavailable.")
    if isinstance(control, BaseException):
        errors.append("Race-control messages unavailable.")
    if isinstance(weather_rows, BaseException):
        errors.append("Weather unavailable.")
    drivers = value(driver_rows)
    weather = sorted(value(weather_rows), key=_newest_first, reverse=True)[:1]
    is_race = session.get("session_type") == "Race"

    def timing(result: Row) -> TimingEntry:
        number = result.get("driver_number")
        driver = next((item for item in drivers if item.get("driver_number") == number), {})
        status = "DSQ" if result.get("dsq") else "DNS" if result.get("dns") else "DNF" if result.get("dnf") else "Classified"
        return TimingEntry(
            position=_number(result.get("position")) or 0,
            driver=_js_str(_coalesce(driver.get("name_acronym"), number)),
            fullName=_js_str(_coalesce(driver.get("full_name"), f"Driver {_js_str(number)}")),
            team=_js_str(_coalesce(driver.get("team_name"), "Unavailable")),
            teamColor=_color(driver.get("team_colour")),
            gap=_gap(result.get("gap_to_leader")),
            bestLap="—" if is_race else _lap(result.get("duration")),
            laps=_number(result.get("number_of_laps")),
            status=status,
        )

    messages = [
        item for item in value(control)
        if isinstance(item.get("message"), str) and not math.isnan(parse_ms(_js_str(item.get("date"))))
    ]
    return SessionSnapshot(
        name=_js_str(session.get("session_name")),
        circuit=_js_str(session.get("circuit_short_name")),
        date=_js_str(session.get("date_start")),
        sessionKey=session_key,
        timing=sorted(map(timing, value(results)), key=lambda entry: entry.position or 999),
        messages=[
            RaceControlMessage(
                date=_js_str(item.get("date")),
                message=item["message"],
                category=_js_str(_coalesce(item.get("category"), "Race control")),
            )
            for item in sorted(messages, key=_newest_first, reverse=True)[:8]
        ],
        weather=Weather(
            date=_js_str(weather[0].get("date")),
            air=_number(weather[0].get("air_temperature")),
            track=_number(weather[0].get("track_temperature")),
            humidity=_number(weather[0].get("humidity")),
            wind=_number(weather[0].get("wind_speed")),
            rainfall=_number(weather[0].get("rainfall")),
        ) if weather else None,
        errors=errors,
    )


async def _standings(kind: Literal["driver", "constructor"]) -> tuple[list[Standing], str, str | None]:
    root = _object((await fetch_ok(f"https://api.jolpi.ca/ergast/f1/current/{kind}Standings.json")).json())
    table = _object(_object(root.get("MRData")).get("StandingsTable"))
    lists = _rows(table.get("StandingsLists"))
    if not lists:
        return [], _js_str(table.get("season")), None
    standings_list = lists[0]
    entries = []
    for item in _rows(standings_list.get("DriverStandings" if kind == "driver" else "ConstructorStandings")):
        person = _object(item.get("Driver" if kind == "driver" else "Constructor"))
        points = _js_number(item.get("points"))
        position = _js_number(item.get("position"))
        if not math.isfinite(points) or not math.isfinite(position):
            raise ValueError("Invalid standings")
        name = f"{_js_str(person.get('givenName'))} {_js_str(person.get('familyName'))}" if kind == "driver" else _js_str(person.get("name"))
        entries.append(Standing(name=name, points=points, position=position, color="#ff2938"))
    entries.sort(key=lambda entry: entry.position)
    return entries, _js_str(standings_list.get("season")), _js_str(standings_list.get("round"))


_ENTITIES = [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&apos;", "'")]


def _decode(value: str) -> str:
    value = re.sub(r"<!\[CDATA\[([\s\S]*?)\]\]>", r"\1", value)
    for entity, char in _ENTITIES:
        value = value.replace(entity, char)
    return re.sub(r"&#(\d+);", lambda match: chr(int(match[1])), value).strip()


_BBC_HOSTS = {"www.bbc.co.uk", "www.bbc.com", "bbc.co.uk", "bbc.com"}


async def _news() -> list[NewsStory]:
    xml = (await fetch_ok("https://feeds.bbci.co.uk/sport/formula1/rss.xml")).text
    if "<rss" not in xml:
        raise ValueError("Invalid news feed")
    stories = []
    for match in list(re.finditer(r"<item>([\s\S]*?)</item>", xml))[:12]:
        def field(name: str) -> str:
            found = re.search(rf"<{name}>([\s\S]*?)</{name}>", match[1])
            return _decode(found[1] if found else "")

        title, url, date = field("title"), field("link"), parse_ms(field("pubDate"))
        if not title or math.isnan(date):
            continue
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.hostname not in _BBC_HOSTS:
            continue
        stories.append(NewsStory(title=title, url=url, publishedAt=iso(date)))
    return stories


SOURCES = ["Session data", "Driver standings", "Team standings", "News"]


async def _build(session_key: int | None) -> DashboardResponse:
    results = await _settled(_snapshot(session_key), _standings("driver"), _standings("constructor"), _news())
    session, drivers, teams, stories = [None if isinstance(result, BaseException) else result for result in results]
    errors = []
    for source, result in zip(SOURCES, results):
        if isinstance(result, BaseException):
            log.error("%s failed:", source, exc_info=result)
            errors.append(f"{source} unavailable. Try refreshing.")
    standings = drivers or teams
    return DashboardResponse(
        fetchedAt=iso(now_ms()),
        snapshot=session,
        drivers=drivers[0] if drivers else [],
        teams=teams[0] if teams else [],
        standingsSeason=standings[1] if standings else None,
        standingsRound=standings[2] if standings else None,
        news=stories or [],
        errors=errors,
    )


_cache = create_cache(60)


# A partly failed response is returned but not cached, and never replaces a good one.
async def load_dashboard(session_key: int | None = None) -> DashboardResponse:
    return await _cache(
        str(session_key if session_key is not None else "latest"),
        lambda: _build(session_key),
        lambda data: not data.errors and not (data.snapshot and data.snapshot.errors),
    )
