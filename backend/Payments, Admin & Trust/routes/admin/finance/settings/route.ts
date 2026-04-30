import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { adminFinanceSettingsSchema } from '@/src/presentation/schemas';

export async function PATCH(request: Request) {
  try {
    const parsed = adminFinanceSettingsSchema.parse(await request.json());
    const { authService, adminFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const settings = await adminFinanceService.updateSettings(viewer, parsed);
    return ok({ settings });
  } catch (error) {
    return failure(error);
  }
}


