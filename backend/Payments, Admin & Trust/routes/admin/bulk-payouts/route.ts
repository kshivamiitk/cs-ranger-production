import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { adminBulkPayoutRunSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const parsed = adminBulkPayoutRunSchema.parse(await request.json().catch(() => ({})));
    const { authService, adminFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const result = await adminFinanceService.runBulkPayoutBatch(viewer, parsed);
    return ok(result);
  } catch (error) {
    return failure(error);
  }
}


