type CacheRecord<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
};

type CacheStats = {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
};

const store = new Map<string, CacheRecord<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const stats: CacheStats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
const DEFAULT_MAX_KEYS = Number(process.env.LOCAL_API_CACHE_MAX_KEYS || 2000);
const DEFAULT_STALE_MS = Number(process.env.LOCAL_API_CACHE_STALE_MS || 60_000);

export function stableCacheKey(parts: Array<string | number | boolean | null | undefined>) {
  return parts
    .map((part) => String(part ?? 'none').replace(/[^a-zA-Z0-9:._-]/g, '_'))
    .join(':');
}

export async function cachedValue<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
  options?: { enabled?: boolean; staleMs?: number }
): Promise<T> {
  if (options?.enabled === false || ttlMs <= 0) {
    return producer();
  }

  const now = Date.now();
  const current = store.get(key) as CacheRecord<T> | undefined;

  if (current && current.expiresAt > now) {
    stats.hits += 1;
    return current.value;
  }

  if (current) {
    const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;
    if (staleMs > 0 && current.staleUntil > now) {
      stats.hits += 1;
      void refreshCacheValue(key, ttlMs, staleMs, producer).catch(() => undefined);
      return current.value;
    }
  }

  stats.misses += 1;
  return refreshCacheValue(key, ttlMs, options?.staleMs ?? DEFAULT_STALE_MS, producer);
}

async function refreshCacheValue<T>(
  key: string,
  ttlMs: number,
  staleMs: number,
  producer: () => Promise<T>
): Promise<T> {
  const active = inflight.get(key) as Promise<T> | undefined;
  if (active) {
    return active;
  }

  const pending = (async () => {
    const value = await producer();
    const now = Date.now();

    if (store.size >= DEFAULT_MAX_KEYS) {
      const firstKey = store.keys().next().value;
      if (firstKey) {
        store.delete(firstKey);
        stats.evictions += 1;
      }
    }

    store.set(key, {
      value,
      expiresAt: now + ttlMs,
      staleUntil: now + ttlMs + Math.max(0, staleMs),
    });
    stats.sets += 1;
    return value;
  })();

  inflight.set(key, pending);
  try {
    return await pending;
  } finally {
    inflight.delete(key);
  }
}

export function invalidateCacheByPrefix(prefix: string) {
  let removed = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      removed += 1;
    }
  }
  stats.evictions += removed;
  return removed;
}

export function getLocalApiCacheStats() {
  return { ...stats, keys: store.size };
}

export function clearLocalApiCache() {
  const removed = store.size;
  store.clear();
  stats.evictions += removed;
}

