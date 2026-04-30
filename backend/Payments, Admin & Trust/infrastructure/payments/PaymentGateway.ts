import crypto from 'node:crypto';

import { env } from '@/lib/env';
import { premiumPaymentDefaults } from '@/lib/payments';
import { ApplicationError } from '@/src/application/errors';
import type { PaymentGatewayPort } from '@/src/domain/ports';
import type {
  PaymentProvider,
  PremiumPaymentOrder,
  PremiumPaymentWebhookEvent,
  Viewer,
} from '@/src/domain/models';

function amountToMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

class SandboxPaymentGateway implements PaymentGatewayPort {
  getProvider(): PaymentProvider {
    return 'sandbox';
  }

  async createPremiumOrder(input: {
    purchaseId: string;
    pricingPlanId?: string | null;
    courseId: string;
    title: string;
    amount: number;
    currency: string;
    learner: Viewer;
  }): Promise<PremiumPaymentOrder> {
    return {
      purchaseId: input.purchaseId,
      pricingPlanId: input.pricingPlanId ?? null,
      courseId: input.courseId,
      provider: 'sandbox',
      providerOrderId: `sandbox_order_${crypto.randomUUID()}`,
      amount: input.amount,
      currency: input.currency,
      checkoutKey: 'sandbox',
      checkoutMode: 'sandbox',
    };
  }

  async verifyPremiumPayment(input: {
    provider: PaymentProvider;
    providerOrderId: string;
    providerPaymentId: string;
    providerSignature: string | null;
    amount: number;
    currency: string;
  }): Promise<{ verified: true; provider: PaymentProvider }> {
    if (!input.providerOrderId || !input.providerPaymentId) {
      throw new ApplicationError('Sandbox payment verification requires order and payment ids.');
    }

    return {
      verified: true,
      provider: 'sandbox',
    };
  }

  async parsePremiumWebhook(_input: {
    provider: PaymentProvider;
    rawBody: string;
    signature: string | null;
  }): Promise<PremiumPaymentWebhookEvent | null> {
    return null;
  }
}

class RazorpayPaymentGateway implements PaymentGatewayPort {
  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret: string | null
  ) {}

  getProvider(): PaymentProvider {
    return 'razorpay';
  }

  async createPremiumOrder(input: {
    purchaseId: string;
    pricingPlanId?: string | null;
    courseId: string;
    title: string;
    amount: number;
    currency: string;
    learner: Viewer;
  }): Promise<PremiumPaymentOrder> {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountToMinorUnits(input.amount),
        currency: input.currency,
        receipt: input.purchaseId,
        notes: {
          courseId: input.courseId,
          courseTitle: input.title,
          learnerUserId: input.learner.user.id,
          learnerEmail: input.learner.user.email,
        },
      }),
    });

    if (!response.ok) {
      throw new ApplicationError('Payment provider order creation failed.', 502);
    }

    const data = (await response.json()) as { id?: string; amount?: number; currency?: string };
    if (!data.id) {
      throw new ApplicationError('Payment provider order creation returned an invalid response.', 502);
    }

    return {
      purchaseId: input.purchaseId,
      pricingPlanId: input.pricingPlanId ?? null,
      courseId: input.courseId,
      provider: 'razorpay',
      providerOrderId: data.id,
      amount: input.amount,
      currency: data.currency ?? input.currency,
      checkoutKey: this.keyId,
      checkoutMode: 'razorpay',
    };
  }

  async verifyPremiumPayment(input: {
    provider: PaymentProvider;
    providerOrderId: string;
    providerPaymentId: string;
    providerSignature: string | null;
    amount: number;
    currency: string;
  }): Promise<{ verified: true; provider: PaymentProvider }> {
    if (!input.providerSignature) {
      throw new ApplicationError('Payment provider signature is required.', 400);
    }

    const digest = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${input.providerOrderId}|${input.providerPaymentId}`)
      .digest('hex');

    if (digest !== input.providerSignature) {
      throw new ApplicationError('Payment signature verification failed.', 400);
    }

    return {
      verified: true,
      provider: 'razorpay',
    };
  }

  verifyWebhookSignature(body: string, signature: string | null) {
    if (!this.webhookSecret) {
      throw new ApplicationError('Razorpay webhook secret is not configured.', 500);
    }

    if (!signature) {
      throw new ApplicationError('Razorpay webhook signature is missing.', 400);
    }

    const digest = crypto.createHmac('sha256', this.webhookSecret).update(body).digest('hex');
    if (digest !== signature) {
      throw new ApplicationError('Razorpay webhook signature verification failed.', 400);
    }
  }

  async parsePremiumWebhook(input: {
    provider: PaymentProvider;
    rawBody: string;
    signature: string | null;
  }): Promise<PremiumPaymentWebhookEvent | null> {
    this.verifyWebhookSignature(input.rawBody, input.signature);

    const payload = JSON.parse(input.rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            status?: string;
          };
        };
      };
    };

    const eventType = payload.event ?? 'unknown';
    const paymentEntity = payload.payload?.payment?.entity;
    const providerOrderId = paymentEntity?.order_id ?? null;
    const providerPaymentId = paymentEntity?.id ?? null;
    const paymentStatus = paymentEntity?.status ?? null;

    if (!providerOrderId) {
      return null;
    }

    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      return null;
    }

    if (paymentStatus && paymentStatus !== 'captured') {
      return null;
    }

    return {
      provider: 'razorpay',
      providerOrderId,
      providerPaymentId,
      providerSignature: input.signature,
      paymentStatus: 'paid',
      eventType,
    };
  }
}

export function createPaymentGateway(): PaymentGatewayPort {
  if (env.razorpayKeyId && env.razorpayKeySecret) {
    return new RazorpayPaymentGateway(env.razorpayKeyId, env.razorpayKeySecret, env.razorpayWebhookSecret);
  }

  return new SandboxPaymentGateway();
}

export function resolveDefaultPaymentProvider(): PaymentProvider {
  return env.razorpayKeyId && env.razorpayKeySecret ? 'razorpay' : 'sandbox';
}

export function buildSandboxVerificationPayload(order: PremiumPaymentOrder) {
  return {
    providerOrderId: order.providerOrderId,
    providerPaymentId: `sandbox_payment_${crypto.randomUUID()}`,
    providerSignature: null,
    amount: order.amount,
    currency: order.currency ?? premiumPaymentDefaults.currency,
  };
}

