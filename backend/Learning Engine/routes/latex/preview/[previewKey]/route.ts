import type { NextRequest } from 'next/server';

import { createServerContainer } from '@/src/infrastructure/container/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ previewKey: string }> }
) {
  const { previewKey } = await context.params;
  const { richContentPreviewService } = await createServerContainer();
  const asset = await richContentPreviewService.getLatexPreviewAsset(previewKey);

  if (!asset) {
    return new Response('Latex preview not found.', { status: 404 });
  }

  return new Response(Buffer.from(asset.bytes), {
    headers: {
      'Content-Type': asset.contentType,
      'Content-Disposition': 'inline; filename="latex-preview.pdf"',
      'Cache-Control': 'private, max-age=300',
      ETag: asset.etag,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

