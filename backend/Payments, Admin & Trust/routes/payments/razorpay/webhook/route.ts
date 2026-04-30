import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const { premiumPaymentService } = await createServerContainer({ writeCookies: true });
    const result = await premiumPaymentService.handleWebhook({
      provider: 'razorpay',
      rawBody,
      signature,
    });
    return ok({ received: true, ...result });
  } catch (error) {
    return failure(error);
  }
}


