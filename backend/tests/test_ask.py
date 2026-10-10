import json

from types import SimpleNamespace

from google.genai import errors
from fastapi.testclient import TestClient

from app import ask
from app.main import app
from app.strategy import DriverStrategy, StintFit, StrategyResponse


class FakeGemini:
    def __init__(self):
        self.calls, self.fail = [], False
        self.models = self

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if self.fail:
            raise errors.ClientError(403, {"error": {"message": "secret internals", "status": "PERMISSION_DENIED"}})
        return SimpleNamespace(
            text="VER should stay out.",
            candidates=[SimpleNamespace(finish_reason=SimpleNamespace(name="STOP"))],
            usage_metadata=SimpleNamespace(prompt_token_count=900, candidates_token_count=8),
        )


def test_ask_guardrails(monkeypatch):
    gemini = FakeGemini()
    monkeypatch.setattr(ask, "_client", lambda: gemini)
    monkeypatch.setattr(ask, "DAILY_CAP", 100)
    ask._recent.clear()
    ask._day.update(date="", count=0)

    async def strategy(session_key, lap):
        stint = StintFit(startLap=1, endLap=None, compound="HARD", tyreAgeAtStart=0, degSlope=0.05, baseLap=92.1, laps=[(2, 92.2)])
        driver = DriverStrategy(driver="VER", teamColor="#3671C6", position=1, gapAhead=None, tyreAge=lap, windowLap=31, windowOpen=False, stints=[stint])
        return StrategyResponse(sessionKey=session_key, session="Race", lap=lap, totalLaps=57, safetyCar=None, pitLoss=21.4, drivers=[driver], alerts=[])

    async def news():
        return []

    monkeypatch.setattr(ask, "load_strategy", strategy)
    monkeypatch.setattr(ask, "_news", news)
    client = TestClient(app)

    def post(question="Should the leader pit now?", ip="1.1.1.1", **extra):
        return client.post("/api/f1/ask", json={"question": question, "sessionKey": 9999, "lap": 20, **extra}, headers={"X-Forwarded-For": ip})

    # Validation happens before any limit or Gemini call.
    assert post("x" * 501).status_code == 400
    assert post("   ").status_code == 400
    assert post(lap="20").status_code == 400  # strict: no string coercion
    assert client.get("/api/f1/ask").status_code == 405

    # Answer is grounded in the lap's strategy (fit points stripped) with a bounded output budget.
    ok = post()
    assert ok.status_code == 200 and ok.json() == {"answer": "VER should stay out."}
    call = gemini.calls[-1]
    assert call["config"].max_output_tokens == ask.MAX_TOKENS
    data = json.loads(call["config"].system_instruction[1].removeprefix("<race_data>\n").removesuffix("\n</race_data>"))
    assert data["strategy"]["lap"] == 20 and data["strategy"]["drivers"][0]["windowLap"] == 31
    assert "laps" not in data["strategy"]["drivers"][0]["stints"][0]

    # Per-IP: 5 a minute, other IPs unaffected.
    assert [post(ip="2.2.2.2").status_code for _ in range(6)] == [200] * 5 + [429]
    assert post(ip="5.5.5.5").status_code == 200
    assert len(gemini.calls) == 7

    # Daily cap: once reached, every IP gets a clear 429 and Gemini is not called.
    monkeypatch.setattr(ask, "DAILY_CAP", 7)
    capped = post(ip="3.3.3.3")
    assert capped.status_code == 429 and "for today" in capped.json()["error"]
    assert len(gemini.calls) == 7

    # Gemini errors become a clean 502.
    ask._day["count"] = 0
    gemini.fail = True
    failed = post(ip="4.4.4.4")
    assert failed.status_code == 502 and "secret" not in failed.text and "AccessDenied" not in failed.text
