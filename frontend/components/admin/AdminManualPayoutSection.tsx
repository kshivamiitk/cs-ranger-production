'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { AdminWithdrawalQueue } from '@/components/admin/AdminWithdrawalQueue';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiJson } from '@/src/presentation/http/client';
import type { AdminWithdrawalQueueItem } from '@/src/domain/models';

type AdminManualPayoutSectionProps = {
  withdrawals: AdminWithdrawalQueueItem[];
  currency: string;
};

export function AdminManualPayoutSection({ withdrawals, currency }: AdminManualPayoutSectionProps) {
  return (
    <section className="panel stack">
      <div>
        <h2 className="panel-title">Admin payout</h2>
        <p className="muted" style={{ margin: '8px 0 0' }}>
          While ENABLE_SELF_WITHDRAWAL is false, creators do not hit RazorpayX from their dashboard. Create a pending
          withdrawal for a creator after you agree on an amount and payout destination, complete the transfer outside the
          app, then mark the row paid from the queue.
        </p>
      </div>

      <AdminWithdrawalQueue withdrawals={withdrawals} />

      <div className="card stack" style={{ gap: 16, marginTop: 8 }}>
        <h3 className="panel-title" style={{ margin: 0 }}>
          Create manual payout record
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          This inserts a pending withdrawal row and reserves funds from the creator&apos;s available balance (same RPC as
          automated withdrawals, without calling the payout provider).
        </p>
        <CreateManualPayoutForm currency={currency} />
      </div>
    </section>
  );
}

function CreateManualPayoutForm({ currency }: { currency: string }) {
  const router = useRouter();
  const [creatorUserId, setCreatorUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await apiJson('/api/admin/payouts', {
          method: 'POST',
          body: JSON.stringify({
            creatorUserId,
            amount: Number(amount),
            payoutMethodSnapshot: payoutMethod,
          }),
        });
        setCreatorUserId('');
        setAmount('');
        setPayoutMethod('');
        setSuccess('Payout record created.');
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Payout creation failed.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="stack" style={{ gap: 12 }}>
      {error ? <div className="studio-inline-alert">{error}</div> : null}
      {success ? (
        <div className="studio-inline-alert" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
          {success}
        </div>
      ) : null}

      <div className="grid-2">
        <label className="field">
          <span className="field-label">Creator user ID</span>
          <Input
            value={creatorUserId}
            onChange={(e) => setCreatorUserId(e.target.value)}
            placeholder="UUID of the creator profile"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Amount ({currency})</span>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Payout method snapshot</span>
        <Input
          className="input"
          value={payoutMethod}
          onChange={(e) => setPayoutMethod(e.target.value)}
          placeholder='UPI id or JSON: {"type":"bank","accountNumber":"...","ifsc":"...","name":"..."}'
          required
        />
      </label>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : `Create pending withdrawal (${currency})`}
      </Button>
    </form>
  );
}


