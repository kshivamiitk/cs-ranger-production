import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { moduleSchema } from '@/src/presentation/schemas';
import { invalidateLearnerCreatorReadCaches } from '@/src/performance/learnerCreatorCache';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await context.params;
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId') ?? '';
    const parsed = moduleSchema.parse(await request.json());
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    await courseBuilderService.updateModule(viewer, { moduleId, courseId, ...parsed });
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId });
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await context.params;
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId') ?? '';
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    await courseBuilderService.deleteModule(viewer, { moduleId, courseId });
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId });
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}
