import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';

export async function POST(
  _request: Request,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const { authService, creatorFollowService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const follow = await creatorFollowService.followCreator(viewer, creatorId);
    return ok({ follow });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const { authService, creatorFollowService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const follow = await creatorFollowService.unfollowCreator(viewer, creatorId);
    return ok({ follow });
  } catch (error) {
    return failure(error);
  }
}


