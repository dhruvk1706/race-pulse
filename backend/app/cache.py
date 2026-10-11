import asyncio
import logging
import os
import time
from functools import cache
from typing import Awaitable, Callable, TypeVar

from pydantic import TypeAdapter

T = TypeVar("T")
log = logging.getLogger(__name__)


# Optional last-good copy in a GCS bucket (CACHE_BUCKET) so a cold Cloud Run instance can still
# serve data while OpenF1 is locked during live sessions. Unset (local dev, tests) = no-op.
@cache
def _bucket():
    name = os.environ.get("CACHE_BUCKET")
    if not name:
        return None
    from google.cloud import storage

    return storage.Client().bucket(name)


async def _save(path: str, adapter: TypeAdapter, value) -> None:
    if bucket := _bucket():
        try:
            await asyncio.to_thread(bucket.blob(path).upload_from_string, adapter.dump_json(value), content_type="application/json")
        except Exception:
            log.warning('Could not persist "%s"', path, exc_info=True)


async def _restore(path: str, adapter: TypeAdapter):
    if bucket := _bucket():
        try:
            return adapter.validate_json(await asyncio.to_thread(bucket.blob(path).download_as_bytes))
        except Exception:
            log.info('No persisted copy of "%s"', path)
    return None


# TTL cache keyed by string. Concurrent loads share one request; a failed or
# degraded refresh serves the last good value instead of an error. With persist=(name, type),
# accepted values are also saved to the bucket and used as the last good value after a restart.
def create_cache(ttl_s: float, max_keys: int = 50, persist: tuple[str, type] | None = None):
    adapter = TypeAdapter(persist[1]) if persist else None
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
            if adapter and (saved := await _restore(f"{persist[0]}/{key}.json", adapter)) is not None:
                log.warning('Serving persisted "%s"', key, exc_info=True)
                return saved
            raise
        if not accept(value):
            if hit:
                return hit[0]
            if adapter and (saved := await _restore(f"{persist[0]}/{key}.json", adapter)) is not None:
                return saved
            return value
        if adapter:
            await _save(f"{persist[0]}/{key}.json", adapter, value)
        store.pop(key, None)
        store[key] = (value, time.monotonic())
        if len(store) > max_keys:
            del store[next(iter(store))]
        return value

    return get
