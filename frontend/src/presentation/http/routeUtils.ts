import { NextResponse } from 'next/server';
import type { ZodIssue } from 'zod';
import { ZodError } from 'zod';

import { ApplicationError } from '@/src/application/errors';
import { logger } from '@/src/platform/observability/logger';
import { getOrCreateRequestId, requestIdHeader } from '@/src/platform/observability/requestContext';
import { messages } from '@/shared/config/messages';

export function ok<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export function publicApiCacheHeaders(input?: { sMaxAge?: number; staleWhileRevalidate?: number }) {
  const sMaxAge = input?.sMaxAge ?? 120;
  const staleWhileRevalidate = input?.staleWhileRevalidate ?? 300;

  return {
    'Cache-Control': `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    Vary: 'Accept-Encoding',
  };
}

export function privateApiCacheHeaders(_input?: { maxAge?: number; staleWhileRevalidate?: number }) {
  return {
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie, Authorization',
  };
}

type FailureCode =
  | 'VALIDATION_FAILED'
  | 'BUSINESS_RULE_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_SERVER_ERROR';

type FailureOptions = {
  request?: Request | null;
  requestId?: string;
};

function normalizeFailureOptions(input?: Request | FailureOptions | null): FailureOptions {
  if (!input) {
    return {};
  }

  if ('headers' in input) {
    return { request: input };
  }

  return input;
}

function applicationErrorCode(status: number): FailureCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  return 'BUSINESS_RULE_FAILED';
}

function errorEnvelope(requestId: string, code: FailureCode, message: string, details?: unknown) {
  return {
    success: false,
    requestId,
    error: {
      code,
      message,
    },
    ...(details === undefined ? {} : { details }),
  };
}

export function failure(error: unknown, options?: Request | FailureOptions | null) {
  const normalizedOptions = normalizeFailureOptions(options);
  const requestId = normalizedOptions.requestId ?? getOrCreateRequestId(normalizedOptions.request);
  const headers = {
    ...requestIdHeader(requestId),
    ...privateApiCacheHeaders(),
  };

  if (error instanceof ZodError) {
    return NextResponse.json(
      errorEnvelope(
        requestId,
        'VALIDATION_FAILED',
        formatZodIssue(error.issues[0]) ?? messages.api.validationFailed,
        error.flatten()
      ),
      { status: 400, headers }
    );
  }

  if (error instanceof ApplicationError) {
    return NextResponse.json(
      errorEnvelope(requestId, applicationErrorCode(error.statusCode), error.message),
      { status: error.statusCode, headers }
    );
  }

  logger.error('api_route_unhandled_error', {
    requestId,
    error,
  });

  return NextResponse.json(
    errorEnvelope(requestId, 'INTERNAL_SERVER_ERROR', messages.api.unexpectedServerError),
    { status: 500, headers }
  );
}

export function isStrictInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/')) {
    return false;
  }

  if (value.startsWith('//') || value.includes('\\')) {
    return false;
  }

  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return false;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || decoded.includes('\\') || /[\u0000-\u001f\u007f]/.test(decoded)) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const parsed = new URL(value, 'https://cs-ranger.invalid');
    if (parsed.origin !== 'https://cs-ranger.invalid') {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export function safeNextPath(value: string | null | undefined, fallback = '/dashboard') {
  if (!isStrictInternalPath(value)) {
    return fallback;
  }

  return value;
}

export function assertBodySize(request: Request, maxBytes: number) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ApplicationError(`Request body exceeds the ${maxBytes.toLocaleString()} byte limit.`, 413);
  }
}

export async function readTextWithLimit(request: Request, maxBytes: number) {
  assertBodySize(request, maxBytes);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new ApplicationError(`Request body exceeds the ${maxBytes.toLocaleString()} byte limit.`, 413);
  }
  return text;
}

export async function readJsonWithLimit(request: Request, maxBytes: number) {
  const text = await readTextWithLimit(request, maxBytes);
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApplicationError('Request body must be valid JSON.', 400);
  }
}

export function strictInternalPathOrDefault(value: string | null | undefined, fallback = '/dashboard') {
  if (!isStrictInternalPath(value)) {
    return fallback;
  }

  return value;
}

function formatZodIssue(issue: ZodIssue | undefined) {
  if (!issue) {
    return null;
  }

  const issueOrigin = 'origin' in issue ? issue.origin : undefined;

  if (issue.message && !issue.message.startsWith('Too big: expected')) {
    return issue.message;
  }

  if (issue.code === 'too_big' && issueOrigin === 'string') {
    return messages.api.inputTooLarge;
  }

  if (issue.code === 'too_small' && issueOrigin === 'string') {
    return messages.api.inputTooSmall;
  }

  return issue.message || messages.api.validationFailed;
}
