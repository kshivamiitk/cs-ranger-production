export type EnvPayoutMode = 'manual' | 'self_withdrawal' | 'admin_bulk';

const productionAppUrl = 'https://cs-ranger.in';
const localAppUrl = 'http://localhost:3000';

function isLocalHostName(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function resolveAppUrl() {
  const configuredUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
  const fallbackUrl = process.env.NODE_ENV === 'production' ? productionAppUrl : localAppUrl;

  if (!configuredUrl) {
    return fallbackUrl;
  }

  try {
    const parsedUrl = new URL(configuredUrl);
    if (process.env.NODE_ENV === 'production' && isLocalHostName(parsedUrl.hostname)) {
      return productionAppUrl;
    }

    return parsedUrl.origin;
  } catch {
    return fallbackUrl;
  }
}

function resolvePayoutMode(): EnvPayoutMode {
  const raw = (process.env.PAYOUT_MODE ?? '').trim().toLowerCase();
  if (raw === 'manual' || raw === 'self_withdrawal' || raw === 'admin_bulk') {
    return raw;
  }

  return process.env.ENABLE_SELF_WITHDRAWAL === 'true' ? 'self_withdrawal' : 'manual';
}

const payoutMode = resolvePayoutMode();
const appUrl = resolveAppUrl();

export const env = {
  appUrl,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  razorpayxKeyId: process.env.RAZORPAYX_KEY_ID ?? '',
  razorpayxKeySecret: process.env.RAZORPAYX_KEY_SECRET ?? '',
  razorpayxAccountNumber: process.env.RAZORPAYX_ACCOUNT_NUMBER ?? '',
  razorpayxWebhookSecret: process.env.RAZORPAYX_WEBHOOK_SECRET ?? '',
  enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
  rateLimitRedisUrl: process.env.RATE_LIMIT_REDIS_URL ?? process.env.REDIS_URL ?? '',
  rateLimitRedisToken: process.env.RATE_LIMIT_REDIS_TOKEN ?? '',
  allowSandboxPayouts: process.env.ALLOW_SANDBOX_PAYOUTS === 'true',
  payoutMode,
  enableSelfWithdrawal: payoutMode === 'self_withdrawal',
  enableAdminBulkPayout: payoutMode === 'admin_bulk',
  adminBulkPayoutAuto: process.env.ADMIN_BULK_PAYOUT_AUTO === 'true',
  adminBulkPayoutDay: (process.env.ADMIN_BULK_PAYOUT_DAY ?? 'TUESDAY').trim().toUpperCase(),
  adminBulkPayoutTimeUtc: (process.env.ADMIN_BULK_PAYOUT_TIME_UTC ?? '04:00').trim(),
  adminBulkPayoutTimezone: (process.env.ADMIN_BULK_PAYOUT_TIMEZONE ?? 'UTC').trim(),
  adminBulkPayoutDryRun: process.env.ADMIN_BULK_PAYOUT_DRY_RUN === 'true',
};

export function describePayoutMode() {
  if (env.enableAdminBulkPayout) {
    return env.adminBulkPayoutAuto
      ? `Admin bulk payout mode is active. Eligible creators are paid automatically every ${env.adminBulkPayoutDay} at ${env.adminBulkPayoutTimeUtc} ${env.adminBulkPayoutTimezone}.`
      : 'Admin bulk payout mode is active. Admin can run a full-wallet payout batch for all eligible creators.';
  }

  if (env.enableSelfWithdrawal) {
    return 'Self-withdrawal mode is active. Creators initiate RazorpayX payouts on demand from their finance page.';
  }

  return 'Manual payout mode is active. Admin records and reconciles payouts outside the automated provider flow.';
}

export function assertSupabaseEnv() {
  if (!env.supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!env.supabaseAnonKey) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}
