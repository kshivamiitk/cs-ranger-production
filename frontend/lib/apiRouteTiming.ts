type RouteResponse = Response | Promise<Response>;
type RouteHandler<Args extends unknown[] = unknown[]> = (...args: Args) => RouteResponse;

function firstRequest(args: unknown[]) {
  const candidate = args[0];
  return candidate instanceof Request ? candidate : null;
}

function isLocalRequest(request: Request | null) {
  if (process.env.API_TIMING_LOGS === 'true') {
    return true;
  }

  if (!request) {
    return process.env.NODE_ENV !== 'production';
  }

  try {
    const hostname = new URL(request.url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}

function responseStatus(response: unknown) {
  if (response instanceof Response) {
    return response.status;
  }

  return 'unknown';
}

function requestPath(request: Request | null) {
  if (!request) {
    return 'unknown-path';
  }

  try {
    const url = new URL(request.url);
    return `${url.pathname}${url.search}`;
  } catch {
    return request.url;
  }
}

function logApiTiming(input: {
  method: string;
  request: Request | null;
  startedAt: number;
  status: number | string;
  failed?: boolean;
}) {
  if (!isLocalRequest(input.request)) {
    return;
  }

  const elapsedMs = performance.now() - input.startedAt;
  const statusLabel = input.failed ? 'ERROR' : String(input.status);
  console.info(`[api-timing] ${input.method} ${requestPath(input.request)} ${statusLabel} ${elapsedMs.toFixed(1)}ms`);
}

export function withApiTiming<Args extends unknown[]>(
  handler: RouteHandler<Args>,
  method: string
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const request = firstRequest(args);
    const startedAt = performance.now();

    try {
      const response = await handler(...args);
      logApiTiming({
        method,
        request,
        startedAt,
        status: responseStatus(response),
      });
      return response;
    } catch (error) {
      logApiTiming({
        method,
        request,
        startedAt,
        status: 'error',
        failed: true,
      });
      throw error;
    }
  };
}
