from app.weekend import get_session_status, parse_ms, select_race_meeting


def meeting(key, name, start, end, **extra):
    return {"meeting_key": key, "meeting_name": name, "circuit_short_name": "C", "location": "L", "country_name": "X",
            "year": 2026, "date_start": start, "date_end": end, **extra}


def test_get_session_status():
    start, end = "2026-10-09T08:30:00+00:00", "2026-10-09T09:30:00Z"
    assert get_session_status(start, end, parse_ms("2026-10-09T08:00:00Z")) == "upcoming"
    assert get_session_status(start, end, parse_ms("2026-10-09T09:00:00Z")) == "live"
    assert get_session_status(start, end, parse_ms("2026-10-09T09:30:00Z")) == "completed"


def test_select_race_meeting():
    meetings = [
        meeting(1, "Spanish Grand Prix", "2026-06-01T10:00:00Z", "2026-06-03T16:00:00Z"),
        meeting(2, "Pre-Season Testing", "2026-06-10T10:00:00Z", "2026-06-12T16:00:00Z"),
        meeting(3, "Austrian Grand Prix", "2026-06-20T10:00:00Z", "2026-06-22T16:00:00Z"),
        meeting(4, "British Grand Prix", "2026-06-15T10:00:00Z", "2026-06-17T16:00:00Z", is_cancelled=True),
        meeting(5, "Belgian Grand Prix", "2026-07-01T10:00:00Z", "2026-07-03T16:00:00Z"),
    ]
    pick = lambda now: select_race_meeting(meetings, parse_ms(now)).meetingKey
    assert pick("2026-06-02T00:00:00Z") == 1  # active
    assert pick("2026-06-11T00:00:00Z") == 3  # next race, skipping testing and cancelled events
    assert pick("2026-08-01T00:00:00Z") == 5  # season over: most recent
    assert select_race_meeting([], 0) is None
