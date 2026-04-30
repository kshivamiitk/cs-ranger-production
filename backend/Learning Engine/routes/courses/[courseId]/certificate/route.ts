import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { authService, certificateService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const eligibility = await certificateService.getEligibility(viewer, courseId);
    return ok({ eligibility });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { authService, certificateService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const certificate = await certificateService.issueForCourse(viewer, courseId);
    return ok({ certificate });
  } catch (error) {
    return failure(error);
  }
}


