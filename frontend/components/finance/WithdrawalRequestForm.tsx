'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { formatCurrency } from '@/lib/utils';
import { apiJson } from '@/src/presentation/http/client';

export type WithdrawalRequestFormProps = {
  availableBalance?: number;
  currency?: string;
  minimumWithdrawalAmount?: number;
  defaultPayoutMethodSnapshot?: string;
};

function withdrawalFieldMessage(
  numericAmount: number,
  payoutMethodSnapshot: string,
  min: number,
  availableBalance: number | undefined,
  currency: string | undefined
): string | null {
  if (!Number.isFinite(numericAmount)) {
    return 'Enter a valid amount.';
  }
  if (numericAmount <= 0) {
    return 'Amount must be greater than zero.';
  }
  if (min > 0 && numericAmount < min) {
    return currency
      ? `Minimum withdrawal is ${formatCurrency(min, currency)}.`
      : `Minimum withdrawal is ${min}.`;
  }
  if (availableBalance !== undefined && numericAmount > availableBalance) {
    return 'Amount exceeds available balance.';
  }
  const payout = payoutMethodSnapshot.trim();
  if (payout.length > 0 && payout.length < 5) {
    return 'Payout method should include enough detail (at least 5 characters).';
  }
  if (payout.length === 0) {
    return 'Payout method is required.';
  }
  return null;
}

export function WithdrawalRequestForm({
  availableBalance,
  currency,
  minimumWithdrawalAmount,
  defaultPayoutMethodSnapshot,
}: WithdrawalRequestFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('0');
  const [payoutMethodSnapshot, setPayoutMethodSnapshot] = useState(defaultPayoutMethodSnapshot ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const numericAmount = Number(amount);
  const min = minimumWithdrawalAmount ?? 0;

  const fieldMessage = useMemo(
    () =>
      withdrawalFieldMessage(numericAmount, payoutMethodSnapshot, min, availableBalance, currency),
    [availableBalance, currency, min, numericAmount, payoutMethodSnapshot]
  );

  const showFieldHints = numericAmount > 0 || payoutMethodSnapshot.trim().length > 0;
  const cannotSubmit = fieldMessage !== null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (cannotSubmit) {
      setError(fieldMessage ?? 'Check the form and try again.');
      return;
    }

    startTransition(async () => {
      try {
        await apiJson<{ withdrawal: unknown }>('/api/creator/withdrawals', {
          method: 'POST',
          body: JSON.stringify({
            amount: numericAmount,
            payoutMethodSnapshot: payoutMethodSnapshot.trim(),
          }),
        });
        setAmount('0');
        setPayoutMethodSnapshot('');
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Withdrawal failed.');
      }
    });
  }

  const minLabel =
    min > 0 && currency ? formatCurrency(min, currency) : min > 0 ? String(min) : null;

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div>
        <h2 className="panel-title">Withdraw funds</h2>
        <p className="muted">
          Withdrawals are initiated on demand through RazorpayX when self withdrawal is enabled in the server
          environment.
        </p>
        {availableBalance !== undefined && currency ? (
          <p className="muted">Available balance: {formatCurrency(availableBalance, currency)}</p>
        ) : null}
        {minLabel ? <p className="muted">Minimum withdrawal: {minLabel}</p> : null}
      </div>

      <label className="field">
        <span className="field-label">Amount{currency ? ` (${currency})` : ''}</span>
        <Input
          type="number"
          min={min > 0 ? min : 0}
          max={availableBalance !== undefined ? availableBalance : undefined}
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        {showFieldHints && fieldMessage ? <span className="field-error">{fieldMessage}</span> : null}
      </label>

      <label className="field">
        <span className="field-label">Payout method snapshot</span>
        <TextArea
          value={payoutMethodSnapshot}
          onChange={(event) => setPayoutMethodSnapshot(event.target.value)}
          placeholder='UPI id (example: name@bank) or JSON: {"type":"bank","accountNumber":"...","ifsc":"...","name":"..."}'
        />
      </label>

      <Button type="submit" disabled={pending || cannotSubmit}>
        {pending ? 'Processing...' : 'Withdraw now'}
      </Button>

      {error ? <div className="field-error">{error}</div> : null}
    </form>
  );
}


