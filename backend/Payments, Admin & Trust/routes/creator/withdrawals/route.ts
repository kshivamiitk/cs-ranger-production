import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { withdrawalSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const parsed = withdrawalSchema.parse(await request.json());
    const { authService, creatorFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const withdrawal = await creatorFinanceService.createWithdrawalRequest(viewer, parsed);
    return ok({ withdrawal });
  } catch (error) {
    return failure(error);
  }
}


