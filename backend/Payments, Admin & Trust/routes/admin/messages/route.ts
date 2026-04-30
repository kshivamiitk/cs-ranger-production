import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { adminMessageSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const parsed = adminMessageSchema.parse(await request.json());
    const { authService, adminMessageService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const message = await adminMessageService.createMessage(viewer, parsed);
    return ok({ message });
  } catch (error) {
    return failure(error);
  }
}


