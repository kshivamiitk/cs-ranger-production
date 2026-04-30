import type { NextRequest } from 'next/server';

import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { latexPreviewRequestSchema, latexPreviewSourceSchema } from '@/src/presentation/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  _context: RouteContext<'/api/latex/preview'>
) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    const source = contentType.startsWith('text/plain')
      ? latexPreviewSourceSchema.parse(await request.text())
      : latexPreviewRequestSchema.parse(await request.json()).source;
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
    return failure(error);
  }
}


