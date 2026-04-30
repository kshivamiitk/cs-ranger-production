import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { adminManualPayoutSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const parsed = adminManualPayoutSchema.parse(await request.json());
    const { authService, adminFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const withdrawal = await adminFinanceService.createManualWithdrawalRecord(viewer, parsed);
    return ok({ withdrawal });
  } catch (error) {
    return failure(error);
  }
}


