import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { reorderSchema } from '@/src/presentation/schemas';
import { invalidateLearnerCreatorReadCaches } from '@/src/performance/learnerCreatorCache';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const parsed = reorderSchema.parse(await request.json());
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    await courseBuilderService.reorderModules(viewer, { courseId, moduleIdsInOrder: parsed.ids });
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId });
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}
