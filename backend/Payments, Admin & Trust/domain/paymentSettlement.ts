import type { PlatformSettings, PurchaseSettlement } from '@/src/domain/models';

export function calculatePurchaseSettlement(
  grossAmount: number,
  settings: Pick<PlatformSettings, 'platformFeePercent' | 'platformFlatFeeAmount' | 'currency'>
): PurchaseSettlement {
  const feePercentAmount = (grossAmount * settings.platformFeePercent) / 100;
  const platformFeeAmount = Number(
    Math.max(0, Math.min(grossAmount, feePercentAmount + settings.platformFlatFeeAmount)).toFixed(2)
  );
  const creatorNetAmount = Number(Math.max(0, grossAmount - platformFeeAmount).toFixed(2));

  return {
    grossAmount: Number(grossAmount.toFixed(2)),
    platformFeeAmount,
    creatorNetAmount,
    currency: settings.currency,
  };
}


