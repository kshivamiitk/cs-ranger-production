import crypto from 'node:crypto';

import { env } from '@/lib/env';
import { ApplicationError } from '@/src/application/errors';
import type { PayoutGatewayPort } from '@/src/domain/ports';
import type { CreatorPayoutResult, CreatorPayoutWebhookEvent, PayoutProvider } from '@/src/domain/models';

type ParsedPayoutMethod =
  | {
      type: 'upi';
      vpa: string;
      accountHolderName: string;
      email: string | null;
      phone: string | null;
    }
  | {
      type: 'bank';
      accountNumber: string;
      ifsc: string;
      accountHolderName: string;
      email: string | null;
      phone: string | null;
    };

function amountToMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

function normalizeStatus(status: string | null | undefined): CreatorPayoutResult['status'] {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'processed') {
    return 'processed';
  }

  if (normalized === 'failed' || normalized === 'rejected' || normalized === 'cancelled' || normalized === 'reversed') {
    return 'failed';
  }

  return 'pending';
}

function sanitizePhone(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const digits = input.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

function extractOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parsePayoutMethodSnapshot(snapshot: string, fallbackName: string, fallbackEmail: string): ParsedPayoutMethod {
  const trimmed = snapshot.trim();
  if (!trimmed) {
    throw new ApplicationError('Payout method details are required.');
  }

  if (trimmed.startsWith('{')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new ApplicationError('Payout method JSON is invalid.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new ApplicationError('Payout method JSON must be an object.');
    }

    const input = parsed as Record<string, unknown>;
    const type = extractOptionalString(input.type)?.toLowerCase();
    const accountHolderName = extractOptionalString(input.accountHolderName) ?? extractOptionalString(input.name) ?? fallbackName;
    const email = extractOptionalString(input.email) ?? extractOptionalString(fallbackEmail);
    const phone = sanitizePhone(extractOptionalString(input.phone));

    if (type === 'upi') {
      const vpa = extractOptionalString(input.vpa) ?? extractOptionalString(input.address);
      if (!vpa || !vpa.includes('@')) {
        throw new ApplicationError('UPI payout details need a valid `vpa` (for example `name@bank`).');
      }

      return {
        type: 'upi',
        vpa,
        accountHolderName,
        email,
        phone,
      };
    }

    if (type === 'bank') {
      const accountNumber = extractOptionalString(input.accountNumber);
      const ifsc = extractOptionalString(input.ifsc)?.toUpperCase();
      if (!accountNumber || !ifsc) {
        throw new ApplicationError('Bank payout details need both `accountNumber` and `ifsc`.');
      }

      return {
        type: 'bank',
        accountNumber,
        ifsc,
        accountHolderName,
        email,
        phone,
      };
    }

    throw new ApplicationError('Payout method JSON `type` must be either `upi` or `bank`.');
  }

  if (!trimmed.includes('@')) {
    throw new ApplicationError('Enter a valid UPI id (for example `name@bank`) or a payout JSON object.');
  }

  return {
    type: 'upi',
    vpa: trimmed,
    accountHolderName: fallbackName,
    email: extractOptionalString(fallbackEmail),
    phone: null,
  };
}

class UnavailablePayoutGateway implements PayoutGatewayPort {
  getProvider(): PayoutProvider {
    return 'razorpayx';
  }

  async createCreatorPayout(_input: {
    withdrawalRequestId: string;
    creatorUserId: string;
    creatorName: string | null;
    creatorEmail: string;
    amount: number;
    currency: string;
    payoutMethodSnapshot: string;
  }): Promise<CreatorPayoutResult> {
    throw new ApplicationError(
      'RazorpayX payouts are not configured. Set RAZORPAYX_KEY_ID, RAZORPAYX_KEY_SECRET, and RAZORPAYX_ACCOUNT_NUMBER.',
      503
    );
  }

  async parseCreatorPayoutWebhook(_input: {
    provider: 'razorpayx';
    rawBody: string;
    signature: string | null;
  }): Promise<CreatorPayoutWebhookEvent | null> {
    throw new ApplicationError('RazorpayX payouts are not configured.', 503);
  }
}

class SandboxPayoutGateway implements PayoutGatewayPort {
  getProvider(): PayoutProvider {
    return 'sandbox';
  }

  async createCreatorPayout(_input: {
    withdrawalRequestId: string;
    creatorUserId: string;
    creatorName: string | null;
    creatorEmail: string;
    amount: number;
    currency: string;
    payoutMethodSnapshot: string;
  }): Promise<CreatorPayoutResult> {
    return {
      provider: 'sandbox',
      payoutId: `sandbox_payout_${crypto.randomUUID()}`,
      payoutStatus: 'processed',
      status: 'processed',
      failureReason: null,
    };
  }

  async parseCreatorPayoutWebhook(_input: {
    provider: 'razorpayx';
    rawBody: string;
    signature: string | null;
  }): Promise<CreatorPayoutWebhookEvent | null> {
    return null;
  }
}

class RazorpayXPayoutGateway implements PayoutGatewayPort {
  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly sourceAccountNumber: string,
    private readonly webhookSecret: string | null
  ) {}

  getProvider(): PayoutProvider {
    return 'razorpayx';
  }

  async createCreatorPayout(input: {
    withdrawalRequestId: string;
    creatorUserId: string;
    creatorName: string | null;
    creatorEmail: string;
    amount: number;
    currency: string;
    payoutMethodSnapshot: string;
  }): Promise<CreatorPayoutResult> {
    const fallbackName = input.creatorName?.trim() || 'Creator';
    const payoutMethod = parsePayoutMethodSnapshot(input.payoutMethodSnapshot, fallbackName, input.creatorEmail);
    const authHeader = {
      Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };

    const contactResponse = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        name: payoutMethod.accountHolderName,
        type: 'vendor',
        email: payoutMethod.email ?? undefined,
        contact: payoutMethod.phone ?? undefined,
        reference_id: input.creatorUserId,
        notes: {
          creatorUserId: input.creatorUserId,
        },
      }),
    });

    if (!contactResponse.ok) {
      throw new ApplicationError('Payout contact creation failed.', 502);
    }

    const contactData = (await contactResponse.json()) as { id?: string };
    if (!contactData.id) {
      throw new ApplicationError('Payout contact creation returned an invalid response.', 502);
    }

    const fundAccountPayload =
      payoutMethod.type === 'upi'
        ? {
            contact_id: contactData.id,
            account_type: 'vpa',
            vpa: {
              address: payoutMethod.vpa,
            },
          }
        : {
            contact_id: contactData.id,
            account_type: 'bank_account',
            bank_account: {
              name: payoutMethod.accountHolderName,
              ifsc: payoutMethod.ifsc,
              account_number: payoutMethod.accountNumber,
            },
          };

    const fundAccountResponse = await fetch('https://api.razorpay.com/v1/fund_accounts', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify(fundAccountPayload),
    });

    if (!fundAccountResponse.ok) {
      throw new ApplicationError('Payout fund account creation failed.', 502);
    }

    const fundAccountData = (await fundAccountResponse.json()) as { id?: string };
    if (!fundAccountData.id) {
      throw new ApplicationError('Payout fund account creation returned an invalid response.', 502);
    }

    const payoutResponse = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        account_number: this.sourceAccountNumber,
        fund_account_id: fundAccountData.id,
        amount: amountToMinorUnits(input.amount),
        currency: input.currency,
        mode: payoutMethod.type === 'upi' ? 'UPI' : 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: false,
        reference_id: input.withdrawalRequestId,
        narration: 'Creator withdrawal',
        notes: {
          creatorUserId: input.creatorUserId,
          withdrawalRequestId: input.withdrawalRequestId,
        },
      }),
    });

    const payoutData = (await payoutResponse.json()) as {
      id?: string;
      status?: string;
      failure_reason?: string | null;
      error?: { description?: string };
    };

    if (!payoutResponse.ok) {
      const reason = payoutData.error?.description || payoutData.failure_reason || 'Payout request failed at provider.';
      throw new ApplicationError(reason, 502);
    }

    const payoutStatus = payoutData.status ?? 'unknown';
    return {
      provider: 'razorpayx',
      payoutId: payoutData.id ?? null,
      payoutStatus,
      status: normalizeStatus(payoutStatus),
      failureReason: payoutData.failure_reason ?? null,
    };
  }

  private verifyWebhookSignature(body: string, signature: string | null) {
    if (!this.webhookSecret) {
      throw new ApplicationError('RazorpayX webhook secret is not configured.', 500);
    }

    if (!signature) {
      throw new ApplicationError('RazorpayX webhook signature is missing.', 400);
    }

    const digest = crypto.createHmac('sha256', this.webhookSecret).update(body).digest('hex');
    const normalizedSignature = signature.trim();
    const expected = Buffer.from(digest);
    const actual = Buffer.from(normalizedSignature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      throw new ApplicationError('RazorpayX webhook signature verification failed.', 400);
    }
  }

  async parseCreatorPayoutWebhook(input: {
    provider: 'razorpayx';
    rawBody: string;
    signature: string | null;
  }): Promise<CreatorPayoutWebhookEvent | null> {
    this.verifyWebhookSignature(input.rawBody, input.signature);

    const payload = JSON.parse(input.rawBody) as {
      event?: string;
      payload?: {
        payout?: {
          entity?: {
            id?: string;
            status?: string;
            reference_id?: string | null;
            failure_reason?: string | null;
          };
        };
      };
    };

    const eventType = payload.event ?? 'unknown';
    const entity = payload.payload?.payout?.entity;
    if (!entity) {
      return null;
    }

    const payoutStatus = entity.status ?? null;
    return {
      provider: 'razorpayx',
      eventType,
      withdrawalRequestId: entity.reference_id ?? null,
      payoutId: entity.id ?? null,
      payoutStatus,
      status: normalizeStatus(payoutStatus),
      failureReason: entity.failure_reason ?? null,
    };
  }
}

export function createPayoutGateway(): PayoutGatewayPort {
  if (env.razorpayxKeyId && env.razorpayxKeySecret && env.razorpayxAccountNumber) {
    return new RazorpayXPayoutGateway(
      env.razorpayxKeyId,
      env.razorpayxKeySecret,
      env.razorpayxAccountNumber,
      env.razorpayxWebhookSecret
    );
  }

  if (env.allowSandboxPayouts) {
    return new SandboxPayoutGateway();
  }

  return new UnavailablePayoutGateway();
}


