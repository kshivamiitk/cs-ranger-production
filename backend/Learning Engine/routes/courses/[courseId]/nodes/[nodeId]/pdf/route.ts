import { NextResponse } from 'next/server';

import { defaultTheme } from '@/lib/constants';
import { ApplicationError } from '@/src/application/errors';
import { createServerContainer } from '@/src/infrastructure/container/server';
import type { PdfNodePayload } from '@/src/domain/models';
import { failure } from '@/src/presentation/http/routeUtils';

const PDF_DATA_URL_PREFIX = 'data:application/pdf;base64,';
const PDF_FETCH_TIMEOUT_MS = 8000;
const PDF_MAX_BYTES = 25 * 1024 * 1024;

function guardedPdfHeaders(byteLength?: number) {
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="protected-course-node.pdf"',
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Accept-Ranges': 'none',
    'X-Content-Type-Options': 'nosniff',
    'X-Download-Options': 'noopen',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "frame-ancestors 'self'",
    Vary: 'Cookie, Sec-Fetch-Dest, Sec-Fetch-Site',
  });

  if (typeof byteLength === 'number') {
    headers.set('Content-Length', String(byteLength));
  }

  return headers;
}

function assertEmbeddedPdfRequest(request: Request) {
  const fetchDest = request.headers.get('sec-fetch-dest');
  if (fetchDest && !['iframe', 'embed', 'object'].includes(fetchDest)) {
    throw new ApplicationError('PDF files can only be opened inside the protected course reader.', 403);
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    throw new ApplicationError('PDF reader requests must come from CS Ranger.', 403);
  }
}

function decodePdfDataUrl(source: string) {
  if (!source.startsWith(PDF_DATA_URL_PREFIX)) {
    return null;
  }

  const base64 = source.slice(PDF_DATA_URL_PREFIX.length);
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.byteLength > PDF_MAX_BYTES) {
    throw new ApplicationError('This PDF is too large for the protected reader.', 413);
  }

  return bytes;
}

async function fetchPdfSource(source: string) {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new ApplicationError('This PDF source is not supported by the protected reader.', 400);
  }

  if (url.protocol !== 'https:') {
    throw new ApplicationError('Only uploaded PDFs or HTTPS legacy PDF sources can be opened.', 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/pdf',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new ApplicationError('The protected reader could not load this PDF.', 502);
    }

    const contentLength = Number(response.headers.get('content-length') ?? '0');
    if (contentLength > PDF_MAX_BYTES) {
      throw new ApplicationError('This PDF is too large for the protected reader.', 413);
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (contentType && !contentType.includes('application/pdf') && !url.pathname.toLowerCase().endsWith('.pdf')) {
      throw new ApplicationError('The protected reader only supports PDF documents.', 400);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > PDF_MAX_BYTES) {
      throw new ApplicationError('This PDF is too large for the protected reader.', 413);
    }

    return bytes;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolvePdfBytes(source: string) {
  const uploadedBytes = decodePdfDataUrl(source);
  if (uploadedBytes) {
    return uploadedBytes;
  }

  return fetchPdfSource(source);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    assertEmbeddedPdfRequest(request);

    const { courseId, nodeId } = await context.params;
    const { authService, catalogService } = await createServerContainer({ writeCookies: true });
    const { viewer } = await authService.getViewerContext(defaultTheme);
    const courseView = await catalogService.getCourseNodeView(viewer, courseId, nodeId);

    if (courseView.nodeLocked || !courseView.node || courseView.node.type !== 'pdf') {
      throw new ApplicationError('PDF node was not found or is locked.', 404);
    }

    const payload = courseView.node.payload as PdfNodePayload;
    const source = payload.pdfUrl.trim();
    if (!source) {
      throw new ApplicationError('No PDF has been uploaded for this node.', 404);
    }

    const bytes = await resolvePdfBytes(source);
    return new NextResponse(bytes, {
      status: 200,
      headers: guardedPdfHeaders(bytes.byteLength),
    });
  } catch (error) {
    return failure(error, request);
  }
}
