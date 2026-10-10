import asyncio

from app import track
from app.weekend import parse_ms


def test_leader_end_takes_first_car_to_finish_the_lap(monkeypatch):
    rows = [
        {"lap_number": 5, "date_start": "2026-01-01T10:00:00Z", "lap_duration": 90.0},  # leader ends 10:01:30
        {"lap_number": 5, "date_start": "2026-01-01T10:00:02Z", "lap_duration": 89.0},  # P2 ends 10:01:31
        {"lap_number": 5, "date_start": "2026-01-01T09:59:00Z", "lap_duration": None},  # untimed: skipped
        {"lap_number": 6, "date_start": "2026-01-01T10:01:29Z", "lap_duration": None},  # next lap start counts
    ]

    async def fake_list(resource):
        return rows

    monkeypatch.setattr(track, "_list", fake_list)
    assert asyncio.run(track._leader_end(1, 5)) == parse_ms("2026-01-01T10:01:29Z")
    rows.clear()
    assert asyncio.run(track._leader_end(1, 5)) is None
