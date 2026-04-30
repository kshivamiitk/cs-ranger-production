import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { nodeSchema } from '@/src/presentation/schemas';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await context.params;
    const body = await request.json();
    const parsed = nodeSchema.parse(body);
    const courseId = typeof body?.courseId === 'string' ? body.courseId : '';
    const moduleId = typeof body?.moduleId === 'string' ? body.moduleId : '';
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    await courseBuilderService.updateNode(viewer, {
      courseId,
      moduleId,
      nodeId,
      title: parsed.title,
      payload: parsed.payload,
      isPremium: parsed.isPremium,
      excerpt: parsed.excerpt,
    });
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await context.params;
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId') ?? '';
    const moduleId = url.searchParams.get('moduleId') ?? '';
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    await courseBuilderService.deleteNode(viewer, { courseId, moduleId, nodeId });
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}


