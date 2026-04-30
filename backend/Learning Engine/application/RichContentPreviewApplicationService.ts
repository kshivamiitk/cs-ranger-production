import type { LatexPreviewGateway } from '@/src/domain/ports';

export class RichContentPreviewApplicationService {
  constructor(private readonly latexPreviewGateway: LatexPreviewGateway) {}

  async compileLatexPreview(source: string) {
    return this.latexPreviewGateway.compilePreview({ source });
  }

  async getLatexPreviewAsset(previewKey: string) {
    return this.latexPreviewGateway.getPreviewAsset(previewKey);
  }
}


