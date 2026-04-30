import type { Viewer } from '@/src/domain/models';
import { NodeDiscussionApplicationService } from '@/src/application/NodeDiscussionApplicationService';

export class NodeDiscussionQueryService {
  constructor(private readonly nodeDiscussionService: NodeDiscussionApplicationService) {}

  async getNodeDiscussionView(viewer: Viewer | null, nodeId: string) {
    return this.nodeDiscussionService.getNodeDiscussionView(viewer, nodeId);
  }
}


