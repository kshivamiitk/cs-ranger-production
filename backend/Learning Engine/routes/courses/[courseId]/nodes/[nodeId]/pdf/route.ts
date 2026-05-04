import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

import { defaultTheme } from '@/lib/constants';
import { ApplicationError } from '@/src/application/errors';
import { nodeIsLocked } from '@/src/domain/courseAccess';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { learnerCreatorCacheKey } from '@/src/performance/learnerCreatorCache';
import { cachedValue } from '@/shared/performance/apiCache';
import type { CourseEntitlement, PdfNodePayload, Viewer } from '@/src/domain/models';
import { failure } from '@/src/presentation/http/routeUtils';

const PDF_DATA_URL_PREFIX = 'data:application/pdf;base64,';
const PDF_FETCH_TIMEOUT_MS = 8000;
const PDF_MAX_BYTES = 25 * 1024 * 1024;
const PDF_BYTE_CACHE_MS = Number(process.env.PDF_NODE_BYTE_CACHE_MS ?? 60_000);
const PDF_BYTE_CACHE_MAX_BYTES = Number(process.env.PDF_NODE_BYTE_CACHE_MAX_BYTES ?? 75 * 1024 * 1024);

const pdfByteCache = new Map<string, { bytes: Buffer; expiresAt: number; byteLength: number }>();
let pdfByteCacheBytes = 0;

type PdfCourseRow = {
  id: string;
  creator_user_id: string;
  premium_enabled: boolean | null;
  price_amount: number | string | null;
  premium_access_days: number | null;
  status: string | null;
};

type PdfModuleRow = {
  id: string;
  course_id: string;
};

type PdfNodeRow = {
  id: string;
  module_id: string;
  type: string;
  title: string;
  payload: unknown;
  is_premium: boolean | null;
};

type PdfEntitlementRow = {
  id: string;
  course_id: string;
  learner_user_id: string;
  purchase_id: string;
  starts_at: string;
  expires_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type PdfPurchaseAccessRow = {
  id: string;
  course_id: string;
  learner_user_id: string;
  access_starts_at: string | null;
  access_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type PdfNodeWithCourseRow = PdfNodeRow & {
  course_modules:
    | (PdfModuleRow & {
        courses: PdfCourseRow | PdfCourseRow[] | null;
      })
    | Array<
        PdfModuleRow & {
          courses: PdfCourseRow | PdfCourseRow[] | null;
        }
      >
    | null;
};

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
  });

  if (typeof byteLength === 'number') {
    headers.set('Content-Length', String(byteLength));
  }

  return headers;
}

function assertEmbeddedPdfRequest(request: Request) {
  const fetchDest = request.headers.get('sec-fetch-dest');
  if (fetchDest && !['iframe', 'embed', 'object', 'empty'].includes(fetchDest)) {
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

function pdfSourceCacheKey(source: string) {
  return createHash('sha256').update(source).digest('hex');
}

function prunePdfByteCache(requiredBytes = 0) {
  const now = Date.now();
  for (const [key, value] of pdfByteCache) {
    if (value.expiresAt <= now) {
      pdfByteCache.delete(key);
      pdfByteCacheBytes -= value.byteLength;
    }
  }

  while (pdfByteCacheBytes + requiredBytes > PDF_BYTE_CACHE_MAX_BYTES && pdfByteCache.size > 0) {
    const oldestKey = pdfByteCache.keys().next().value;
    if (!oldestKey) {
      break;
    }

    const oldest = pdfByteCache.get(oldestKey);
    pdfByteCache.delete(oldestKey);
    pdfByteCacheBytes -= oldest?.byteLength ?? 0;
  }
}

async function resolveCachedPdfBytes(source: string) {
  if (PDF_BYTE_CACHE_MS <= 0 || PDF_BYTE_CACHE_MAX_BYTES <= 0) {
    return resolvePdfBytes(source);
  }

  const key = pdfSourceCacheKey(source);
  const now = Date.now();
  const current = pdfByteCache.get(key);
  if (current && current.expiresAt > now) {
    return current.bytes;
  }

  if (current) {
    pdfByteCache.delete(key);
    pdfByteCacheBytes -= current.byteLength;
  }

  const bytes = await resolvePdfBytes(source);
  if (bytes.byteLength <= Math.min(PDF_MAX_BYTES, PDF_BYTE_CACHE_MAX_BYTES)) {
    prunePdfByteCache(bytes.byteLength);
    pdfByteCache.set(key, {
      bytes,
      expiresAt: now + PDF_BYTE_CACHE_MS,
      byteLength: bytes.byteLength,
    });
    pdfByteCacheBytes += bytes.byteLength;
  }

  return bytes;
}

function toCourseAccessShape(course: PdfCourseRow) {
  return {
    creatorUserId: course.creator_user_id,
    premiumEnabled: Boolean(course.premium_enabled),
    priceAmount: Number(course.price_amount ?? 0),
    premiumAccessDays: Number(course.premium_access_days ?? 0),
  };
}

function toCourseEntitlement(row: PdfEntitlementRow): CourseEntitlement {
  return {
    id: row.id,
    courseId: row.course_id,
    learnerUserId: row.learner_user_id,
    purchaseId: row.purchase_id,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    status: row.status === 'active' ? 'active' : 'expired',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function purchaseAccessIsActive(row: PdfPurchaseAccessRow, now = new Date()) {
  if (!row.access_expires_at || new Date(row.access_expires_at).getTime() <= now.getTime()) {
    return false;
  }

  if (!row.access_starts_at) {
    return true;
  }

  return new Date(row.access_starts_at).getTime() <= now.getTime();
}

function purchaseAccessToEntitlement(row: PdfPurchaseAccessRow): CourseEntitlement {
  return {
    id: `purchase-access:${row.id}`,
    courseId: row.course_id,
    learnerUserId: row.learner_user_id,
    purchaseId: row.id,
    startsAt: row.access_starts_at ?? row.created_at,
    expiresAt: row.access_expires_at ?? row.created_at,
    status: 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadFastPdfContext(courseId: string, nodeId: string) {
  return cachedValue(
    learnerCreatorCacheKey(['course', courseId, 'pdf-context', nodeId]),
    30_000,
    () => loadFastPdfContextUncached(courseId, nodeId),
    { staleMs: 30_000 }
  );
}

async function loadFastPdfContextUncached(courseId: string, nodeId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('course_nodes')
    .select(`
      id,
      module_id,
      type,
      title,
      payload,
      is_premium,
      course_modules!inner (
        id,
        course_id,
        courses!inner (
          id,
          creator_user_id,
          premium_enabled,
          price_amount,
          premium_access_days,
          status
        )
      )
    `)
    .eq('id', nodeId)
    .eq('course_modules.course_id', courseId)
    .maybeSingle();

  if (error) {
    const message = 'message' in error ? String(error.message) : '';
    if (message.toLowerCase().includes('relation') || message.toLowerCase().includes('relationship')) {
      return loadFastPdfContextSequential(courseId, nodeId);
    }

    throw error;
  }

  if (!data || String((data as PdfNodeRow).type) !== 'pdf') {
    throw new ApplicationError('PDF node was not found or is locked.', 404);
  }

  const pdfNodeWithCourse = data as unknown as PdfNodeWithCourseRow;
  const pdfNode = pdfNodeWithCourse as PdfNodeRow;
  const pdfModule = Array.isArray(pdfNodeWithCourse.course_modules)
    ? pdfNodeWithCourse.course_modules[0] ?? null
    : pdfNodeWithCourse.course_modules;
  if (!pdfModule || pdfModule.course_id !== courseId) {
    throw new ApplicationError('PDF node was not found or is locked.', 404);
  }

  const pdfCourse = Array.isArray(pdfModule.courses) ? pdfModule.courses[0] ?? null : pdfModule.courses;
  if (!pdfCourse || pdfCourse.status !== 'published') {
    throw new ApplicationError('PDF node was not found or is locked.', 404);
  }

  return { node: pdfNode, course: pdfCourse };
}

async function loadFastPdfContextSequential(courseId: string, nodeId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: node, error: nodeError } = await supabase
    .from('course_nodes')
    .select('id, module_id, type, title, payload, is_premium')
    .eq('id', nodeId)
    .maybeSingle();

  if (nodeError) {
    throw nodeError;
  }

  if (!node || String((node as PdfNodeRow).type) !== 'pdf') {
    throw new ApplicationError('PDF node was not found or is locked.', 404);
  }

  const pdfNode = node as PdfNodeRow;
  const { data: module, error: moduleError } = await supabase
    .from('course_modules')
    .select('id, course_id')
    .eq('id', pdfNode.module_id)
    .maybeSingle();

  if (moduleError) {
    throw moduleError;
  }

  const pdfModule = module as PdfModuleRow | null;
  if (!pdfModule || pdfModule.course_id !== courseId) {
    throw new ApplicationError('PDF node was not found or is locked.', 404);
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, creator_user_id, premium_enabled, price_amount, premium_access_days, status')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) {
    throw courseError;
  }

  const pdfCourse = course as PdfCourseRow | null;
  if (!pdfCourse || pdfCourse.status !== 'published') {
    throw new ApplicationError('PDF node was not found or is locked.', 404);
  }

  return { node: pdfNode, course: pdfCourse };
}

async function loadActiveEntitlement(learnerUserId: string, courseId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('course_entitlements')
    .select('id, course_id, learner_user_id, purchase_id, starts_at, expires_at, status, created_at, updated_at')
    .eq('learner_user_id', learnerUserId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .gt('expires_at', nowIso)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return toCourseEntitlement(data as PdfEntitlementRow);
  }

  const { data: purchaseRows, error: purchaseError } = await supabase
    .from('course_purchases')
    .select('id, course_id, learner_user_id, access_starts_at, access_expires_at, created_at, updated_at')
    .eq('learner_user_id', learnerUserId)
    .eq('course_id', courseId)
    .eq('payment_status', 'paid')
    .not('access_expires_at', 'is', null)
    .gt('access_expires_at', nowIso)
    .order('access_expires_at', { ascending: false })
    .limit(3);

  if (purchaseError) {
    throw purchaseError;
  }

  const activePurchase = ((purchaseRows ?? []) as PdfPurchaseAccessRow[]).find((row) => purchaseAccessIsActive(row));
  return activePurchase ? purchaseAccessToEntitlement(activePurchase) : null;
}

async function resolveViewerIfRequired(node: PdfNodeRow, course: PdfCourseRow) {
  if (!node.is_premium) {
    return { viewer: null, activeEntitlement: null };
  }

  const { authService } = await createServerContainer({ writeCookies: true });
  const { viewer } = await authService.getViewerContext(defaultTheme);
  const viewerBypassesEntitlement = Boolean(
    viewer && (viewer.user.id === course.creator_user_id || viewer.profile.isAdmin)
  );
  const activeEntitlement =
    viewer && !viewerBypassesEntitlement ? await loadActiveEntitlement(viewer.user.id, course.id) : null;

  return { viewer, activeEntitlement };
}

function parsePdfPayload(payload: unknown): PdfNodePayload {
  const raw = payload && typeof payload === 'object' ? payload as Partial<PdfNodePayload> : {};
  return {
    pdfUrl: typeof raw.pdfUrl === 'string' ? raw.pdfUrl : '',
    title: typeof raw.title === 'string' ? raw.title : null,
    note: typeof raw.note === 'string' ? raw.note : '',
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    assertEmbeddedPdfRequest(request);

    const { courseId, nodeId } = await context.params;
    const { node, course } = await loadFastPdfContext(courseId, nodeId);
    const { viewer, activeEntitlement } = await resolveViewerIfRequired(node, course);
    const locked = nodeIsLocked(
      viewer as Viewer | null,
      toCourseAccessShape(course),
      { isPremium: Boolean(node.is_premium) },
      activeEntitlement
    );

    if (locked) {
      throw new ApplicationError('PDF node was not found or is locked.', 404);
    }

    const payload = parsePdfPayload(node.payload);
    const source = payload.pdfUrl.trim();
    if (!source) {
      throw new ApplicationError('No PDF has been uploaded for this node.', 404);
    }

    const bytes = await resolveCachedPdfBytes(source);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: guardedPdfHeaders(bytes.byteLength),
    });
  } catch (error) {
    return failure(error, request);
  }
}
