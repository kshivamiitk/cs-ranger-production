export type ApiTestEndpoint = {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  expectedStatuses: number[];
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  notes?: string;
};

export type ApiTestResult = ApiTestEndpoint & {
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
  responsePreview?: string;
};



