'use client';

import { useEffect, useState } from 'react';
import { detectLatexSourceMode } from '@/src/domain/latexSource';

interface LatexPreviewState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  previewUrl: string | null;
  error: string | null;
  diagnostics: string[];
  mode: 'fragment' | 'document';
  kind: 'compile_error' | 'compiler_missing' | 'render_failed' | 'package_missing' | 'timeout' | null;
  lineNumber: number | null;
  focus: string | null;
  hint: string | null;
}

interface LatexPreviewResponseReady {
  status: 'ready';
  previewKey: string;
  previewUrl: string;
  mode: 'fragment' | 'document';
}

interface LatexPreviewResponseError {
  status: 'error';
  mode: 'fragment' | 'document';
  kind: 'compile_error' | 'compiler_missing' | 'render_failed' | 'package_missing' | 'timeout';
  error: string;
  diagnostics: string[];
  lineNumber: number | null;
  focus: string | null;
  hint: string | null;
}

type LatexPreviewResponseBody =
  | LatexPreviewResponseReady
  | LatexPreviewResponseError
  | { error?: string | { message?: string } }
  | Record<string, unknown>;

function extractErrorMessage(body: LatexPreviewResponseBody) {
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }

  return null;
}

function isPreviewReady(body: LatexPreviewResponseBody): body is LatexPreviewResponseReady {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === 'ready' &&
    'mode' in body &&
    (body.mode === 'fragment' || body.mode === 'document') &&
    'previewUrl' in body &&
    typeof body.previewUrl === 'string'
  );
}

function isPreviewError(body: LatexPreviewResponseBody): body is LatexPreviewResponseError {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === 'error' &&
    'mode' in body &&
    (body.mode === 'fragment' || body.mode === 'document') &&
    'error' in body &&
    typeof body.error === 'string' &&
    'diagnostics' in body &&
    Array.isArray(body.diagnostics)
  );
}

const PREVIEW_DEBOUNCE_MS = 700;

export function useLatexDocumentPreview(source: string) {
  const [state, setState] = useState<LatexPreviewState>({
    status: 'idle',
    previewUrl: null,
    error: null,
    diagnostics: [],
    mode: 'fragment',
    kind: null,
    lineNumber: null,
    focus: null,
    hint: null,
  });

  useEffect(() => {
    const trimmedSource = source.trim();
    const mode = detectLatexSourceMode(trimmedSource);
    if (!trimmedSource) {
      setState({
        status: 'idle',
        previewUrl: null,
        error: null,
        diagnostics: [],
        mode,
        kind: null,
        lineNumber: null,
        focus: null,
        hint: null,
      });
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setState((current) => ({
        ...current,
        status: 'loading',
        error: null,
        diagnostics: [],
        mode,
        kind: null,
        lineNumber: null,
        focus: null,
        hint: null,
      }));

      try {
        const response = await fetch('/api/latex/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
          body: trimmedSource,
          signal: controller.signal,
        });

        const body = (await response.json().catch(() => ({}))) as LatexPreviewResponseBody;

        if (!response.ok) {
          setState({
            status: 'error',
            previewUrl: null,
            error: extractErrorMessage(body) ?? 'LaTeX preview request failed.',
            diagnostics: [],
            mode,
            kind: null,
            lineNumber: null,
            focus: null,
            hint: null,
          });
          return;
        }

        if (isPreviewError(body)) {
          setState({
            status: 'error',
            previewUrl: null,
            error: body.error,
            diagnostics: body.diagnostics,
            mode: body.mode,
            kind: body.kind,
            lineNumber: body.lineNumber,
            focus: body.focus,
            hint: body.hint,
          });
          return;
        }

        if (isPreviewReady(body)) {
          setState({
            status: 'ready',
            previewUrl: body.previewUrl,
            error: null,
            diagnostics: [],
            mode: body.mode,
            kind: null,
            lineNumber: null,
            focus: null,
            hint: null,
          });
          return;
        }

        setState({
          status: 'error',
          previewUrl: null,
          error: 'LaTeX preview returned an unexpected response.',
          diagnostics: [],
          mode,
          kind: null,
          lineNumber: null,
          focus: null,
          hint: null,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: 'error',
          previewUrl: null,
          error: error instanceof Error ? error.message : 'LaTeX preview request failed.',
          diagnostics: [],
          mode,
          kind: null,
          lineNumber: null,
          focus: null,
          hint: null,
        });
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [source]);

  return state;
}

