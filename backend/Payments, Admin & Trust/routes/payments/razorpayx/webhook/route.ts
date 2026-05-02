import { createServerContainer } from '@/src/infrastructure/container/server';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { failure, ok, readTextWithLimit } from '@/src/presentation/http/routeUtils';

const WEBHOOK_BODY_LIMIT_BYTES = 1024 * 1024;

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'paymentWebhook');
    if (rateLimited) return rateLimited;

    const rawBody = await readTextWithLimit(request, WEBHOOK_BODY_LIMIT_BYTES);
    const signature = request.headers.get('x-razorpay-signature');
    const { creatorFinanceService } = await createServerContainer({ writeCookies: true });
    const result = await creatorFinanceService.handlePayoutWebhook({
      provider: 'razorpayx',
      rawBody,
      signature,
    });
    return ok({ received: true, ...result });
  } catch (error) {
    return failure(error, request);
  }
}

