import asyncio
import logging
import time
from typing import Awaitable, Callable, TypeVar

T = TypeVar("T")
log = logging.getLogger(__name__)


# TTL cache keyed by string. Concurrent loads share one request; a failed or
# degraded refresh serves the last good value instead of an error.
def create_cache(ttl_s: float, max_keys: int = 50):
    store: dict[str, tuple[object, float]] = {}
    pending: dict[str, asyncio.Future] = {}

    async def get(key: str, load: Callable[[], Awaitable[T]], accept: Callable[[T], bool] = lambda _: True) -> T:
        hit = store.get(key)
        if hit and time.monotonic() - hit[1] < ttl_s:
            return hit[0]
        request = pending.get(key)
        if not request:
            request = asyncio.ensure_future(load())
            pending[key] = request
            request.add_done_callback(lambda _: pending.pop(key, None))
        try:
            # Shield so one caller's cancellation doesn't cancel the shared load.
            value = await asyncio.shield(request)
        except Exception:
            if hit:
                log.warning('Serving stale "%s"', key, exc_info=True)
                return hit[0]
            raise
        if not accept(value):
            return hit[0] if hit else value
        store.pop(key, None)
        store[key] = (value, time.monotonic())
        if len(store) > max_keys:
            del store[next(iter(store))]
        return value

    return get
