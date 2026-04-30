import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function GET(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await context.params;
    const { authService, creatorLearnerDoubtQueryService } = await createServerContainer({
      writeCookies: true,
    });
    const viewer = await authService.requireCreator();
    const detail = await creatorLearnerDoubtQueryService.getCreatorLearnerDoubtDetail(viewer, commentId);
    return ok({ detail });
  } catch (error) {
    return failure(error);
  }
}


