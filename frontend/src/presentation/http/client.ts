import { messages } from '@/shared/config/messages';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? `${messages.api.networkFailed} ${error.message}` : messages.api.networkFailed,
      null,
      error
    );
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const envelopeMessage =
      typeof body?.error === 'object' && body.error !== null && typeof body.error.message === 'string'
        ? body.error.message
        : null;
    const message = envelopeMessage ?? (typeof body?.error === 'string' ? body.error : messages.api.requestFailed);
    throw new ApiClientError(message, response.status, body?.details ?? body);
  }

  return body as T;
}


