type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

type CacheStats = {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
};

const store = new Map<string, CacheRecord<unknown>>();
const stats: CacheStats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
const DEFAULT_MAX_KEYS = Number(process.env.LOCAL_API_CACHE_MAX_KEYS || 2000);

export function stableCacheKey(parts: Array<string | number | boolean | null | undefined>) {
  return parts
    .map((part) => String(part ?? 'none').replace(/[^a-zA-Z0-9:._-]/g, '_'))
    .join(':');
}

export async function cachedValue<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
  options?: { enabled?: boolean }
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
    store.delete(key);
    stats.evictions += 1;
  }

  stats.misses += 1;
  const value = await producer();

  if (store.size >= DEFAULT_MAX_KEYS) {
    const firstKey = store.keys().next().value;
    if (firstKey) {
      store.delete(firstKey);
      stats.evictions += 1;
    }
  }

  store.set(key, { value, expiresAt: now + ttlMs });
  stats.sets += 1;
  return value;
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



