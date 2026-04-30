export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResponse<T> =
  | { success: true; data: T; requestId: string }
  | { success: false; error: ApiError; requestId: string };

export function ok<T>(data: T, requestId: string): ApiResponse<T> {
  return { success: true, data, requestId };
}

export function fail(code: string, message: string, requestId: string, details?: unknown): ApiResponse<never> {
  return { success: false, error: { code, message, details }, requestId };
}



