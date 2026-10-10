import asyncio
import math
from typing import Literal

import numpy as np
import pandas as pd
from pydantic import BaseModel

from .cache import create_cache
from .dashboard import Num, Row, _color, _js_str, _openf1
from .openf1 import HTTPStatusError
from .weekend import now_ms, parse_ms

# ponytail: constant fuel-burn gain per lap; refine per circuit (fuel load, lap length) later.
FUEL_S_PER_LAP = 0.03
# ponytail: flat cold-tyre cost of the out-lap; refine per compound later.
WARMUP_S = 1.0
SC_PIT_FACTOR = 0.5
UNDERCUT_LAPS = 2
MIN_FIT_LAPS = 5  # fewer clean laps give noise, not a slope


class StintFit(BaseModel):
    startLap: Num
    endLap: Num | None  # None while the stint is still running
    compound: str | None
    tyreAgeAtStart: Num
    degSlope: Num | None  # s per lap of tyre age, fuel corrected
    baseLap: Num | None  # fitted fuel-corrected lap time on a new tyre
    laps: list[tuple[Num, Num]]  # (lap, fuel-corrected seconds) used in the fit


class DriverStrategy(BaseModel):
    driver: str
    teamColor: str
    position: Num | None  # None once retired
    gapAhead: Num | None
    tyreAge: Num
    windowLap: Num | None
    windowOpen: bool
    stints: list[StintFit]


class StrategyAlert(BaseModel):
    kind: Literal["pit_window", "cheap_stop", "undercut", "overcut"]
    driver: str
    rival: str | None
    message: str


class StrategyResponse(BaseModel):
    sessionKey: Num
    session: str
    lap: Num
    totalLaps: Num
    safetyCar: Literal["SC", "VSC"] | None
    pitLoss: Num | None  # median pit-lane time so far; halved under SC/VSC
    drivers: list[DriverStrategy]
    alerts: list[StrategyAlert]


class NotRaceSession(Exception):
    pass


def neutralised(control: pd.DataFrame, lap: int) -> dict[int, str]:
    """Lap -> "SC" or "VSC" for laps run behind a safety car, from messages up to `lap`."""
    laps: dict[int, str] = {}
    active, since = None, 0
    messages = control[(control.category == "SafetyCar") & (control.lap_number <= lap)].sort_values("date")
    for number, text in zip(messages.lap_number.astype(int), messages.message.astype(str).str.upper()):
        if "DEPLOYED" in text:
            kind = "VSC" if "VIRTUAL" in text or "VSC" in text else "SC"
            if active:  # VSC upgraded to SC
                laps.update(dict.fromkeys(range(since, number), active))
            active, since = kind, number
        elif active and ("IN THIS LAP" in text or "ENDING" in text):
            laps.update(dict.fromkeys(range(since, number + 1), active))
            active = None
    if active:
        laps.update(dict.fromkeys(range(since, lap + 1), active))
    return laps


def clean_laps(stint: pd.DataFrame, dirty: set[int]) -> pd.DataFrame:
    """Racing laps of one stint (lap_number, lap_duration, tyre_age, is_out, is_in) plus a fuel-corrected time."""
    keep = stint[~stint.is_out & ~stint.is_in & ~stint.lap_number.isin(dirty) & stint.lap_duration.notna()]
    # 107% of the stint's best: traffic, mistakes and yellows aren't tyre wear.
    keep = keep[keep.lap_duration <= keep.lap_duration.min() * 1.07]
    # Burning fuel makes each lap ~FUEL_S_PER_LAP faster; add it back so only tyre wear remains.
    return keep.assign(corrected=keep.lap_duration + FUEL_S_PER_LAP * keep.lap_number)


def fit_deg(clean: pd.DataFrame) -> tuple[float, float] | None:
    """(deg slope s/lap, lap time at tyre age 0)."""
    if len(clean) < MIN_FIT_LAPS:
        return None
    slope, base = np.polyfit(clean.tyre_age.astype(float), clean.corrected.astype(float), 1)
    return float(slope), float(base)


def window_lap(start_lap: int, age_at_start: int, slope: float | None, pit_loss: float | None) -> int | None:
    """First lap where wear lost since the stop (vs a new tyre) exceeds pit loss plus warm-up."""
    if slope is None or pit_loss is None or slope <= 0:
        return None
    lost = np.cumsum(slope * (age_at_start + np.arange(200)))
    over = np.flatnonzero(lost >= pit_loss + WARMUP_S)
    return int(start_lap + over[0]) if over.size else None


def _round(value: float | None, digits: int = 3) -> Num | None:
    return None if value is None or not math.isfinite(value) else round(float(value), digits)


def _tyre(stints: pd.DataFrame, number: int, start: int) -> tuple[str | None, int]:
    # OpenF1's stints table misses stops and is sometimes a lap off, so it's only a compound lookup.
    near = stints[(stints.driver_number == number) & ((stints.lap_start - start).abs() <= 1)]
    if near.empty:
        return None, 0
    row = near.loc[(near.lap_start - start).abs().idxmin()]
    age = row.tyre_age_at_start
    return (row.compound if isinstance(row.compound, str) else None), int(age) if pd.notna(age) else 0


def build(raw: dict, lap: int | None) -> StrategyResponse:
    laps, pit, intervals = raw["laps"], raw["pit"], raw["intervals"]
    total = int(laps.lap_number.max())
    lap = min(lap or total, total)
    sc = neutralised(raw["race_control"], lap)
    status = sc.get(lap)
    dirty = set(sc) | {n + 1 for n in sc}  # the restart lap isn't representative either
    pits = pit[pit.lap_number <= lap]
    median = pits.pit_duration.median()
    pit_loss = None if pd.isna(median) else float(median) * (SC_PIT_FACTOR if status else 1)
    stints = raw["stints"][raw["stints"].lap_start <= lap + 1]

    # As of the moment the leader completes `lap`: who is still running and in what order.
    cutoff = laps.loc[laps.lap_number == lap, "date_end"].min()
    completed = laps[laps.date_end <= cutoff].groupby("driver_number").size()
    latest = intervals[intervals.date <= cutoff].sort_values("date").drop_duplicates("driver_number", keep="last")
    # ponytail: "running" = timing seen in the last minute; a red flag at the cutoff would read as all retired.
    latest = latest[cutoff - latest.date <= pd.Timedelta(seconds=60)]
    latest = latest.assign(done=latest.driver_number.map(completed).fillna(0), gap=latest.gap_to_leader.fillna(math.inf))
    order = list(latest.sort_values(["done", "gap"], ascending=[False, True]).driver_number)
    gap_ahead = dict(zip(latest.driver_number, latest.interval))

    names = {row.get("driver_number"): row for row in raw["drivers"]}
    entries: dict[int, DriverStrategy] = {}
    for number, mine in laps[laps.lap_number <= lap].groupby("driver_number"):
        stops = set(pits.lap_number[pits.driver_number == number].astype(int))
        starts = sorted({1} | {stop + 1 for stop in stops} | set(mine.lap_number[mine.is_pit_out_lap]))
        mine = mine.assign(
            stint=np.searchsorted(starts, mine.lap_number, side="right") - 1,
            is_out=mine.lap_number.isin(starts),
            is_in=mine.lap_number.isin(stops),
        )
        fits = []
        for index, start in enumerate(starts):
            compound, age0 = _tyre(stints, number, start)
            stint = mine[mine.stint == index]
            clean = clean_laps(stint.assign(tyre_age=age0 + stint.lap_number - start), dirty)
            slope, base = fit_deg(clean) or (None, None)
            fits.append(StintFit(
                startLap=start,
                endLap=starts[index + 1] - 1 if index + 1 < len(starts) else None,
                compound=compound,
                tyreAgeAtStart=age0,
                degSlope=_round(slope, 4),
                baseLap=_round(base),
                laps=[(int(n), _round(t)) for n, t in zip(clean.lap_number, clean.corrected)],
            ))
        last = fits[-1]
        age = last.tyreAgeAtStart + max(min(lap, int(mine.lap_number.max())) - last.startLap, 0)
        window = window_lap(last.startLap, last.tyreAgeAtStart, last.degSlope, pit_loss)
        info = names.get(number, {})
        entries[number] = DriverStrategy(
            driver=_js_str(info.get("name_acronym") or number),
            teamColor=_color(info.get("team_colour")),
            position=order.index(number) + 1 if number in order else None,
            gapAhead=_round(gap_ahead.get(number)) if number in order and number != order[0] else None,
            tyreAge=age,
            windowLap=window,
            windowOpen=window is not None and window <= lap,
            stints=fits,
        )
    drivers = sorted(entries.values(), key=lambda entry: entry.position or 999)

    alerts = []
    for entry in drivers:
        if entry.position and entry.windowOpen:
            if status:
                alerts.append(StrategyAlert(kind="cheap_stop", driver=entry.driver, rival=None, message=(
                    f"{status} out: {entry.driver}'s window is open, a stop costs ~{pit_loss:.0f}s")))
            else:
                alerts.append(StrategyAlert(kind="pit_window", driver=entry.driver, rival=None, message=(
                    f"{entry.driver}'s pit window opened on lap {entry.windowLap} ({entry.tyreAge}-lap-old tyres)")))
    # Gaps are neutralised behind a safety car, so undercuts only make sense in green-flag running.
    for ahead, chaser in ([] if status or pit_loss is None else zip(order, order[1:])):
        gap, front, back = gap_ahead.get(chaser), entries.get(ahead), entries.get(chaser)
        slope = front and front.stints[-1].degSlope
        if not (front and back and slope and slope > 0) or gap is None or not math.isfinite(gap) or gap >= pit_loss:
            continue
        if back.tyreAge < front.tyreAge:  # the chaser already stopped: the undercut is under way
            continue
        # Fresh-tyre gain while the car ahead stays out on worn tyres, less the out-lap warm-up.
        gain = sum(slope * (front.tyreAge + lap_out) for lap_out in range(1, UNDERCUT_LAPS + 1)) - WARMUP_S
        front, back = front.driver, back.driver
        if gain > gap:
            alerts.append(StrategyAlert(kind="undercut", driver=back, rival=front, message=(
                f"{back} can undercut {front}: ~{gain:.1f}s fresh-tyre gain over {UNDERCUT_LAPS} laps vs {gap:.1f}s gap")))
        else:
            alerts.append(StrategyAlert(kind="overcut", driver=front, rival=back, message=(
                f"{front} can stay out on {back}: undercut gains ~{max(gain, 0):.1f}s vs {gap:.1f}s gap")))

    return StrategyResponse(
        sessionKey=raw["session"].get("session_key"),
        session=_js_str(raw["session"].get("session_name")),
        lap=lap,
        totalLaps=total,
        safetyCar=status,
        pitLoss=_round(pit_loss, 1),
        drivers=drivers,
        alerts=alerts,
    )


def _frame(rows: list[Row], columns: list[str], dates: tuple[str, ...] = (), numbers: tuple[str, ...] = ()) -> pd.DataFrame:
    frame = pd.DataFrame(rows, columns=columns)
    for column in dates:
        frame[column] = pd.to_datetime(frame[column], utc=True, format="ISO8601", errors="coerce")
    for column in numbers:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    return frame


async def _list(resource: str) -> list[Row]:
    try:
        return await _openf1(resource)
    except HTTPStatusError as error:
        # OpenF1 answers an empty result (e.g. a race with no stops) with 404.
        if error.status == 404:
            return []
        raise


async def _load(session_key: int) -> dict | None:
    query = f"session_key={session_key}"
    sessions = await _list(f"sessions?{query}")
    if not sessions:
        return None
    # Sprints are session_type "Race" too.
    if sessions[0].get("session_type") != "Race":
        return {"session": sessions[0]}
    laps, stints, pit, intervals, control, drivers = await asyncio.gather(
        *(_list(f"{resource}?{query}") for resource in ("laps", "stints", "pit", "intervals", "race_control", "drivers"))
    )
    laps = _frame(laps, ["driver_number", "lap_number", "lap_duration", "date_start", "is_pit_out_lap"],
                  ("date_start",), ("lap_number", "lap_duration"))
    laps = laps.dropna(subset=["lap_number"]).astype({"lap_number": int}).sort_values(["driver_number", "lap_number"], ignore_index=True)
    laps["is_pit_out_lap"] = laps.is_pit_out_lap.eq(True)
    # When each lap was completed; the next lap's start covers laps with no timed duration.
    laps["date_end"] = (laps.date_start + pd.to_timedelta(laps.lap_duration, unit="s")).fillna(
        laps.groupby("driver_number").date_start.shift(-1))
    return {
        "session": sessions[0],
        "drivers": drivers,
        "laps": laps,
        "stints": _frame(stints, ["driver_number", "lap_start", "compound", "tyre_age_at_start"], numbers=("lap_start", "tyre_age_at_start")),
        "pit": _frame(pit, ["driver_number", "lap_number", "pit_duration"], numbers=("lap_number", "pit_duration")).dropna(subset=["lap_number"]),
        "intervals": _frame(intervals, ["driver_number", "date", "gap_to_leader", "interval"], ("date",), ("gap_to_leader", "interval")),
        "race_control": _frame(control, ["date", "lap_number", "category", "message"], ("date",), ("lap_number",)),
    }


def _final(raw: dict | None) -> bool:
    # Only finished sessions with data are cached: they never change after that.
    return raw is not None and parse_ms(_js_str(raw["session"].get("date_end"))) < now_ms() and (
        "laps" not in raw or not raw["laps"].empty)


_cache = create_cache(7 * 86400, max_keys=10)


async def load_strategy(session_key: int, lap: int | None) -> StrategyResponse | None:
    raw = await _cache(str(session_key), lambda: _load(session_key), _final)
    if raw is None:
        return None
    if "laps" not in raw:
        raise NotRaceSession
    return build(raw, lap) if not raw["laps"].empty else None
