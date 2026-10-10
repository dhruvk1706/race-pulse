import asyncio
import math

from pydantic import BaseModel

from .cache import create_cache
from .dashboard import Num, Row, _color, _is_number, _js_str, _number, _openf1
from .strategy import _list
from .weekend import iso, parse_ms


class TrackCar(BaseModel):
    driver: str
    teamColor: str
    x: Num
    y: Num


class TrackResponse(BaseModel):
    sessionKey: Num
    lap: Num
    date: str
    outline: list[tuple[Num, Num]]
    cars: list[TrackCar]


def _stamp(ms: float) -> str:
    # OpenF1 date filters want a naive UTC timestamp.
    return iso(ms)[:-1]


def _window(start_ms: float, end_ms: float) -> str:
    return f"date>={_stamp(start_ms)}&date<{_stamp(end_ms)}"


def _end_ms(lap: Row) -> float:
    return parse_ms(lap.get("date_start")) + lap["lap_duration"] * 1000


async def _base(session_key: int) -> dict | None:
    """Per-session pieces every lap shares: outline, driver lookup and the winner's finish."""
    query = f"session_key={session_key}"
    result, drivers = await asyncio.gather(_openf1(f"session_result?{query}&position=1"), _openf1(f"drivers?{query}"))
    lead = result[0].get("driver_number") if result else None
    if not _is_number(lead):
        return None
    timed = [
        lap for lap in await _openf1(f"laps?{query}&driver_number={_js_str(lead)}")
        if _is_number(lap.get("lap_duration")) and not math.isnan(parse_ms(lap.get("date_start")))
    ]
    if not timed:
        return None
    # Outline: the winner's fastest lap. Default snapshot: the moment the winner finishes their last timed lap.
    fastest = min(timed, key=lambda lap: lap["lap_duration"])
    last = max(timed, key=lambda lap: lap.get("lap_number") or 0)
    path = await _openf1(f"location?{query}&driver_number={_js_str(lead)}&{_window(parse_ms(fastest['date_start']), _end_ms(fastest))}")
    outline = [(row["x"], row["y"]) for row in path if _is_number(row.get("x")) and _is_number(row.get("y"))]
    if len(outline) < 2:
        return None
    return {"outline": outline, "drivers": {item.get("driver_number"): item for item in drivers},
            "lap": last.get("lap_number") or 0, "finish": _end_ms(last)}


async def _leader_end(session_key: int, lap: int) -> float | None:
    """When the race leader completed `lap`: the earliest lap end, or the earliest start of the next lap."""
    rows = await _list(f"laps?session_key={session_key}&lap_number>={lap}&lap_number<={lap + 1}")
    ends = [
        _end_ms(row) if row.get("lap_number") == lap else parse_ms(row.get("date_start"))
        for row in rows
        if (row.get("lap_number") == lap + 1 or _is_number(row.get("lap_duration"))) and not math.isnan(parse_ms(row.get("date_start")))
    ]
    return min(ends) if ends else None


async def _build(session_key: int, lap: int | None) -> TrackResponse | None:
    base = await _base_cache(str(session_key), lambda: _base(session_key), lambda data: data is not None)
    if base is None:
        return None
    moment = base["finish"] if lap is None else await _leader_end(session_key, lap)
    if moment is None:
        return None
    field = await _openf1(f"location?session_key={session_key}&{_window(moment, moment + 1000)}")
    latest: dict[object, Row] = {row.get("driver_number"): row for row in sorted(field, key=lambda row: str(row.get("date")))}
    by_number = base["drivers"]
    cars = [
        TrackCar(
            driver=_js_str(by_number.get(number, {}).get("name_acronym") or number),
            teamColor=_color(by_number.get(number, {}).get("team_colour")),
            x=_number(row.get("x")) or 0,
            y=_number(row.get("y")) or 0,
        )
        for number, row in latest.items()
        if _is_number(row.get("x")) and _is_number(row.get("y"))
    ]
    return TrackResponse(sessionKey=session_key, lap=base["lap"] if lap is None else lap, date=iso(moment), outline=base["outline"], cars=cars)


_base_cache = create_cache(3600)
# A race has ~50-70 laps; keep a couple of races' worth of replay snapshots.
_cache = create_cache(3600, max_keys=200)


# Historical sessions never change, so cache for an hour; None (no data) is retried.
async def load_track(session_key: int, lap: int | None = None) -> TrackResponse | None:
    return await _cache(f"{session_key}:{lap or ''}", lambda: _build(session_key, lap), lambda data: data is not None)
