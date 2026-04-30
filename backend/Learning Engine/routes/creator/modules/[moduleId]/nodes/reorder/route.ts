import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { reorderSchema } from '@/src/presentation/schemas';

export async function POST(
  request: Request,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await context.params;
    const body = await request.json();
    const parsed = reorderSchema.parse(body);
    const courseId = typeof body?.courseId === 'string' ? body.courseId : '';
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    await courseBuilderService.reorderNodes(viewer, {
      courseId,
      moduleId,
      nodeIdsInOrder: parsed.ids,
    });
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}


