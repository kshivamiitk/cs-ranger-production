import { cachedValue, invalidateCacheByPrefix, stableCacheKey } from './apiCache';

export const publicNodeDiscussionCacheMs = Number(process.env.LEARNING_PUBLIC_NODE_DISCUSSION_CACHE_MS ?? 30_000);

export function publicNodeDiscussionCacheKey(nodeId: string) {
  return stableCacheKey(['learning', 'node-discussion', 'public', nodeId]);
}

export function cachedPublicNodeDiscussion<T>(nodeId: string, producer: () => Promise<T>) {
  return cachedValue(publicNodeDiscussionCacheKey(nodeId), publicNodeDiscussionCacheMs, producer);
}

export function invalidatePublicNodeDiscussionCache(nodeId?: string | null) {
  return invalidateCacheByPrefix(
    nodeId ? publicNodeDiscussionCacheKey(nodeId) : stableCacheKey(['learning', 'node-discussion'])
  );
}
