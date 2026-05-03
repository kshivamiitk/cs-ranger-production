import type { NextRequest } from 'next/server';

import { LATEX_PREVIEW_SOURCE_MAX } from '@/src/domain/contentLimits';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok, readJsonWithLimit, readTextWithLimit } from '@/src/presentation/http/routeUtils';
import { latexPreviewRequestSchema, latexPreviewSourceSchema } from '@/src/presentation/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await enforceRateLimit(request, 'latexPreview');
    if (rateLimited) return rateLimited;

    const contentType = request.headers.get('content-type') ?? '';
    const source = contentType.startsWith('text/plain')
      ? latexPreviewSourceSchema.parse(await readTextWithLimit(request, LATEX_PREVIEW_SOURCE_MAX + 1024))
      : latexPreviewRequestSchema.parse(await readJsonWithLimit(request, LATEX_PREVIEW_SOURCE_MAX + 4096)).source;
    const { richContentPreviewService } = await createServerContainer();
    const result = await richContentPreviewService.compileLatexPreview(source);

    if (result.status === 'error') {
      return ok(result);
    }

    return ok({
      ...result,
      previewUrl: `/api/latex/preview/${result.previewKey}`,
    });
  } catch (error) {
    return failure(error, request);
  }
}
