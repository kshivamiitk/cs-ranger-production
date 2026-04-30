import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const { creatorFinanceService } = await createServerContainer({ writeCookies: true });
    const result = await creatorFinanceService.handlePayoutWebhook({
      provider: 'razorpayx',
      rawBody,
      signature,
    });
    return ok({ received: true, ...result });
  } catch (error) {
    return failure(error);
  }
}


