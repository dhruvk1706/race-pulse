import asyncio
import time
from urllib.parse import urlsplit

import httpx

_client = httpx.AsyncClient(follow_redirects=True)


class HTTPStatusError(Exception):
    def __init__(self, url: str, status: int):
        super().__init__(f"{urlsplit(url).netloc} returned HTTP {status}")
        self.status = status


# OpenF1's free tier allows ~3 requests a second, so space request starts out.
OPENF1_GAP_S = 0.35
_next_slot = 0.0


async def _openf1_turn() -> None:
    global _next_slot
    now = time.monotonic()
    slot = max(now, _next_slot)
    _next_slot = slot + OPENF1_GAP_S
    await asyncio.sleep(slot - now)


async def fetch_ok(url: str, timeout_s: float = 15) -> httpx.Response:
    # Total deadline (connect + body), like AbortSignal.timeout.
    async with asyncio.timeout(timeout_s):
        response = await _client.get(url)
    if not response.is_success:
        raise HTTPStatusError(url, response.status_code)
    return response


async def fetch_openf1(resource: str) -> object:
    url = f"https://api.openf1.org/v1/{resource}"
    attempt = 0
    while True:
        await _openf1_turn()
        try:
            return (await fetch_ok(url, 10)).json()
        except HTTPStatusError as error:
            # Retry rate limits only; everything else fails fast.
            if attempt >= 3 or error.status != 429:
                raise
        await asyncio.sleep(attempt + 1)
        attempt += 1
