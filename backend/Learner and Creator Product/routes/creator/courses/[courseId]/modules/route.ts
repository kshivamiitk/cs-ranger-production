import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { moduleSchema } from '@/src/presentation/schemas';
import { invalidateLearnerCreatorReadCaches } from '@/src/performance/learnerCreatorCache';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const parsed = moduleSchema.parse(await request.json());
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const module = await courseBuilderService.createModule(viewer, { courseId, ...parsed });
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId });
    return ok({ module });
  } catch (error) {
    return failure(error);
  }
}
