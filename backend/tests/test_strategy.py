import pandas as pd
import pytest

from app.strategy import FUEL_S_PER_LAP, WARMUP_S, clean_laps, fit_deg, window_lap


def test_deg_fit_and_pit_window():
    # Stint from lap 10 on new tyres: 0.1 s/lap of wear, masked by fuel burn, plus junk laps to drop.
    laps = list(range(10, 22))
    stint = pd.DataFrame({
        "lap_number": laps,
        "tyre_age": [lap - 10 for lap in laps],
        "lap_duration": [90 + 0.1 * (lap - 10) - FUEL_S_PER_LAP * lap for lap in laps],
        "is_out": [lap == 10 for lap in laps],
        "is_in": [lap == 21 for lap in laps],
    })
    stint.loc[stint.lap_number == 10, "lap_duration"] = 120.0  # out-lap
    stint.loc[stint.lap_number == 14, "lap_duration"] = 140.0  # behind the safety car
    stint.loc[stint.lap_number == 21, "lap_duration"] = 110.0  # in-lap

    clean = clean_laps(stint, dirty={14})
    assert list(clean.lap_number) == [11, 12, 13, 15, 16, 17, 18, 19, 20]
    slope, base = fit_deg(clean)
    assert slope == pytest.approx(0.1)
    assert base == pytest.approx(90)

    # Wear lost by age a is 0.1 * a(a+1)/2: first exceeds 20.5 s + warm-up at a = 21, i.e. lap 31.
    assert 0.1 * 20 * 21 / 2 < 20.5 + WARMUP_S <= 0.1 * 21 * 22 / 2
    assert window_lap(10, 0, slope, 20.5) == 31
    assert window_lap(10, 0, slope, 10.25) < 31  # cheaper stop (SC) opens it earlier
    assert window_lap(10, 0, -0.05, 20.5) is None  # no wear, no window
    assert fit_deg(clean.head(4)) is None
