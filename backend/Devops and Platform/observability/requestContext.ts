import crypto from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,96}$/;

export function createRequestId() {
  return crypto.randomUUID();
}

export function getRequestIdFromHeaders(headers: Headers | null | undefined) {
  const candidate = headers?.get(REQUEST_ID_HEADER)?.trim();
  return candidate && SAFE_REQUEST_ID_PATTERN.test(candidate) ? candidate : null;
}

export function getOrCreateRequestId(request?: Request | { headers?: Headers } | null) {
  return getRequestIdFromHeaders(request?.headers) ?? createRequestId();
}

export function requestIdHeader(requestId: string) {
  return { [REQUEST_ID_HEADER]: requestId };
}

export { REQUEST_ID_HEADER };
