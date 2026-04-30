'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { apiJson } from '@/src/presentation/http/client';
import type { CreatorPayoutProfile } from '@/src/domain/models';

export function CreatorPayoutProfileForm(props: {
  profile: CreatorPayoutProfile | null;
  helpText?: string;
}) {
  const router = useRouter();
  const [payoutMethodSnapshot, setPayoutMethodSnapshot] = useState(props.profile?.payoutMethodSnapshot ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const maskedLabel = props.profile?.maskedPayoutLabel ?? null;
  const fieldError = useMemo(() => {
    const trimmed = payoutMethodSnapshot.trim();
    if (trimmed.length === 0) {
      return 'Payout destination is required.';
    }
    if (trimmed.length < 5) {
      return 'Enter a valid UPI id or bank JSON payload.';
    }
    return null;
  }, [payoutMethodSnapshot]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (fieldError) {
      setError(fieldError);
      return;
    }

    startTransition(async () => {
      try {
        await apiJson('/api/creator/payout-profile', {
          method: 'POST',
          body: JSON.stringify({ payoutMethodSnapshot: payoutMethodSnapshot.trim() }),
        });
        setSuccess('Payout destination saved. Admin bulk payouts and self-withdrawals can reuse it.');
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to save payout destination.');
      }
    });
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div>
        <h2 className="panel-title">Default payout destination</h2>
        <p className="muted">
          Save the UPI id or payout JSON once so self-withdrawals and admin bulk payouts can use the same destination.
        </p>
        {props.helpText ? <p className="muted">{props.helpText}</p> : null}
        {maskedLabel ? <p className="muted">Current destination: {maskedLabel}</p> : null}
      </div>

      <label className="field">
        <span className="field-label">Payout destination snapshot</span>
        <TextArea
          value={payoutMethodSnapshot}
          onChange={(event) => setPayoutMethodSnapshot(event.target.value)}
          placeholder='UPI id (example: name@bank) or JSON: {"type":"bank","accountNumber":"...","ifsc":"...","name":"..."}'
        />
        {fieldError ? <span className="field-error">{fieldError}</span> : null}
      </label>

      {error ? <div className="studio-inline-alert">{error}</div> : null}
      {success ? <div className="studio-inline-notice">{success}</div> : null}

      <div className="inline">
        <Button type="submit" disabled={pending || Boolean(fieldError)}>
          {pending ? 'Saving...' : 'Save payout destination'}
        </Button>
      </div>
    </form>
  );
}


