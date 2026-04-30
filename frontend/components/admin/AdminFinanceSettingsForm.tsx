'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiJson } from '@/src/presentation/http/client';
import type { PlatformSettings } from '@/src/domain/models';

export function AdminFinanceSettingsForm(props: { settings: PlatformSettings }) {
  const router = useRouter();
  const [platformFeePercent, setPlatformFeePercent] = useState(String(props.settings.platformFeePercent));
  const [minimumWithdrawalAmount, setMinimumWithdrawalAmount] = useState(
    String(props.settings.minimumWithdrawalAmount)
  );
  const [settlementHoldDays, setSettlementHoldDays] = useState(String(props.settings.settlementHoldDays));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await apiJson('/api/admin/finance/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            platformFeePercent: Number(platformFeePercent),
            minimumWithdrawalAmount: Number(minimumWithdrawalAmount),
            settlementHoldDays: Number(settlementHoldDays),
          }),
        });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Finance settings update failed.');
      }
    });
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div>
        <h2 className="panel-title">Platform settings</h2>
        <p className="muted text-top-gap">
          Premium purchases always settle through the platform first. Fee percent cannot go below 20.
        </p>
      </div>

      <div className="grid-2">
        <label className="field">
          <span className="field-label">Platform fee percent</span>
          <Input
            type="number"
            min="20"
            max="100"
            step="0.01"
            value={platformFeePercent}
            onChange={(event) => setPlatformFeePercent(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Minimum withdrawal amount</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={minimumWithdrawalAmount}
            onChange={(event) => setMinimumWithdrawalAmount(event.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Settlement hold days</span>
        <Input
          type="number"
          min="0"
          step="1"
          value={settlementHoldDays}
          onChange={(event) => setSettlementHoldDays(event.target.value)}
        />
      </label>

      {error ? <div className="studio-inline-alert">{error}</div> : null}

      <div className="inline">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save finance settings'}
        </Button>
      </div>
    </form>
  );
}


