// TTL cache keyed by string. Concurrent loads share one request; a failed or
// degraded refresh serves the last good value instead of an error.
export function createCache<T>(ttlMs: number, maxKeys = 50) {
  const store = new Map<string, { value: T; at: number }>();
  const pending = new Map<string, Promise<T>>();

  return async function get(key: string, load: () => Promise<T>, accept: (value: T) => boolean = () => true): Promise<T> {
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    let request = pending.get(key);
    if (!request) {
      request = load().finally(() => pending.delete(key));
      pending.set(key, request);
    }
    try {
      const value = await request;
      if (!accept(value)) return hit?.value ?? value;
      store.delete(key);
      store.set(key, { value, at: Date.now() });
      if (store.size > maxKeys) store.delete(store.keys().next().value!);
      return value;
    } catch (error) {
      if (hit) {
        console.warn(`Serving stale "${key}":`, error);
        return hit.value;
      }
      throw error;
    }
  };
}
