import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { creatorPayoutProfileSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const parsed = creatorPayoutProfileSchema.parse(await request.json());
    const { authService, creatorFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const payoutProfile = await creatorFinanceService.savePayoutProfile(viewer, parsed);
    return ok({ payoutProfile });
  } catch (error) {
    return failure(error);
  }
}


