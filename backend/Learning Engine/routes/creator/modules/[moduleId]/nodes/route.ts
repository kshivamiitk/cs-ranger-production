import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { nodeSchema } from '@/src/presentation/schemas';

export async function POST(
  request: Request,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await context.params;
    const body = await request.json();
    const parsed = nodeSchema.parse(body);
    const courseId = typeof body?.courseId === 'string' ? body.courseId : '';
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const node = await courseBuilderService.createNode(viewer, {
      courseId,
      moduleId,
      type: parsed.type,
      title: parsed.title,
      payload: parsed.payload,
      isPremium: parsed.isPremium,
      excerpt: parsed.excerpt,
    });
    return ok({ node });
  } catch (error) {
    return failure(error);
  }
}


