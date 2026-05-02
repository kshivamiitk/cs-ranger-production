import net from 'node:net';
import tls from 'node:tls';

import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { RateLimitPolicies, type RateLimitPolicy } from '@/src/platform/rate-limiting/rateLimitPolicy';
import { logger } from '@/src/platform/observability/logger';
import { getOrCreateRequestId, requestIdHeader } from '@/src/platform/observability/requestContext';

type RateLimitBucket = keyof typeof RateLimitPolicies;

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
};

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

function isRateLimitingEnabled() {
  return env.enableRateLimiting;
}

function resolveClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const userAgent = request.headers.get('user-agent')?.slice(0, 120) ?? 'unknown';
  return (forwardedFor || realIp || `ua:${userAgent}`).replace(/[^a-zA-Z0-9:._-]/g, '_');
}

function rateLimitKey(bucket: RateLimitBucket, request: Request) {
  return `rate:${bucket}:${resolveClientKey(request)}`;
}

function secondsUntil(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

function memoryLimit(key: string, policy: RateLimitPolicy): RateLimitResult {
  const now = Date.now();
  const current = memoryCounters.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + policy.windowSeconds * 1000;
    memoryCounters.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(policy.maxRequests - 1, 0),
      resetSeconds: policy.windowSeconds,
      retryAfterSeconds: 0,
    };
  }

  current.count += 1;
  const retryAfterSeconds = secondsUntil(current.resetAt);
  return {
    allowed: current.count <= policy.maxRequests,
    remaining: Math.max(policy.maxRequests - current.count, 0),
    resetSeconds: retryAfterSeconds,
    retryAfterSeconds,
  };
}

function encodeCommand(parts: Array<string | number>) {
  return `*${parts.length}\r\n${parts.map((part) => {
    const value = String(part);
    return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
  }).join('')}`;
}

function parseResp(buffer: string) {
  const lines = buffer.split('\r\n');
  const integers = lines
    .filter((line) => line.startsWith(':'))
    .map((line) => Number(line.slice(1)))
    .filter((value) => Number.isFinite(value));
  return integers;
}

async function redisIncrement(key: string, policy: RateLimitPolicy): Promise<number> {
  const redisUrl = env.rateLimitRedisUrl;
  if (!redisUrl) {
    throw new Error('RATE_LIMIT_REDIS_URL is not configured.');
  }

  const url = new URL(redisUrl);
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('RATE_LIMIT_REDIS_URL must use redis:// or rediss://.');
  }

  const port = Number(url.port || (url.protocol === 'rediss:' ? 6380 : 6379));
  const host = url.hostname;
  const password = decodeURIComponent(url.password || '');
  const username = decodeURIComponent(url.username || '');
  const commands: string[] = [];

  if (password) {
    commands.push(username ? encodeCommand(['AUTH', username, password]) : encodeCommand(['AUTH', password]));
  }
  commands.push(encodeCommand(['INCR', key]));
  commands.push(encodeCommand(['EXPIRE', key, policy.windowSeconds]));

  const payload = commands.join('');

  return new Promise<number>((resolve, reject) => {
    const socket = url.protocol === 'rediss:'
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });
    let output = '';
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Redis rate limiter timed out.'));
    }, 800);

    socket.on('connect', () => {
      socket.write(payload);
    });
    socket.on('data', (chunk) => {
      output += chunk.toString('utf8');
      if (parseResp(output).length >= 1) {
        clearTimeout(timeout);
        socket.end();
        const [count] = parseResp(output);
        resolve(count ?? 1);
      }
    });
    socket.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.on('end', () => {
      clearTimeout(timeout);
      const [count] = parseResp(output);
      resolve(count ?? 1);
    });
  });
}

async function checkRateLimit(request: Request, bucket: RateLimitBucket): Promise<RateLimitResult | null> {
  if (!isRateLimitingEnabled()) {
    return null;
  }

  const policy = RateLimitPolicies[bucket];
  const key = rateLimitKey(bucket, request);

  if (!env.rateLimitRedisUrl) {
    if (process.env.RATE_LIMIT_MEMORY_FALLBACK === 'true') {
      return memoryLimit(key, policy);
    }
    return null;
  }

  try {
    const count = await redisIncrement(key, policy);
    const allowed = count <= policy.maxRequests;
    return {
      allowed,
      remaining: Math.max(policy.maxRequests - count, 0),
      resetSeconds: policy.windowSeconds,
      retryAfterSeconds: allowed ? 0 : policy.windowSeconds,
    };
  } catch (error) {
    logger.warn('rate_limit_redis_unavailable', {
      bucket,
      error,
    });
    return null;
  }
}

export async function enforceRateLimit(request: Request, bucket: RateLimitBucket) {
  const result = await checkRateLimit(request, bucket);
  if (!result || result.allowed) {
    return null;
  }

  const requestId = getOrCreateRequestId(request);
  return NextResponse.json(
    {
      success: false,
      requestId,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Retry after the indicated delay.',
      },
    },
    {
      status: 429,
      headers: {
        ...requestIdHeader(requestId),
        'Retry-After': String(result.retryAfterSeconds),
        'Cache-Control': 'private, no-store',
      },
    }
  );
}

export function resetInMemoryRateLimiterForTests() {
  memoryCounters.clear();
}
