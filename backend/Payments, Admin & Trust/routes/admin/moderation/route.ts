import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { moderationActionSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const parsed = moderationActionSchema.parse(await request.json());
    const { authService, adminModerationService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const result = parsed.actionType === 'ban'
      ? await adminModerationService.banUser(viewer, parsed)
      : await adminModerationService.unbanUser(viewer, parsed);
    return ok(result);
  } catch (error) {
    return failure(error);
  }
}


