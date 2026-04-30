import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { quizAttemptSchema } from '@/src/presentation/schemas';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const parsed = quizAttemptSchema.parse(await request.json());
    const { authService, quizService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const attempt = await quizService.submitAttempt(viewer, {
      courseId,
      nodeId: parsed.nodeId,
      answers: parsed.answers,
    });
    return ok({ attempt });
  } catch (error) {
    return failure(error);
  }
}


