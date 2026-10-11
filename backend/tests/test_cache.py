import asyncio

import pytest

from app import cache


class FakeBucket:
    def __init__(self):
        self.files: dict[str, bytes] = {}

    def blob(self, path):
        files = self.files

        class Blob:
            def upload_from_string(self, data, content_type=None):
                files[path] = data

            def download_as_bytes(self):
                return files[path]

        return Blob()


def test_persisted_value_survives_restart(monkeypatch):
    bucket = FakeBucket()
    monkeypatch.setattr(cache, "_bucket", lambda: bucket)

    async def fail():
        raise RuntimeError("OpenF1 locked")

    async def run():
        assert await cache.create_cache(60, persist=("t", list[int]))("k", lambda: asyncio.sleep(0, [1, 2])) == [1, 2]
        fresh = cache.create_cache(60, persist=("t", list[int]))  # new instance = cold start
        assert await fresh("k", fail) == [1, 2]
        # a degraded (not accepted) load also falls back to the saved copy
        assert await cache.create_cache(60, persist=("t", list[int]))("k", lambda: asyncio.sleep(0, [9]), lambda _: False) == [1, 2]
        with pytest.raises(RuntimeError):
            await cache.create_cache(60, persist=("t", list[int]))("other", fail)

    asyncio.run(run())
    assert set(bucket.files) == {"t/k.json"}
