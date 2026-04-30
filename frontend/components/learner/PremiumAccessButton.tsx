'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTimeLabel } from '@/lib/utils';
import { apiJson } from '@/src/presentation/http/client';
import type {
  PremiumPaymentOrder,
  PremiumPurchaseFinalization,
  PurchaseSettlement,
} from '@/src/domain/models';

type PricingPlan = {
  id: string;
  title: string;
  description: string | null;
  price_amount: number;
  access_days: number;
  position: number;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

async function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    throw new Error('Payment checkout is only available in the browser.');
  }

  if (window.Razorpay) {
    return window.Razorpay;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay checkout could not be loaded.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay checkout could not be loaded.'));
    document.body.appendChild(script);
  });

  if (!window.Razorpay) {
    throw new Error('Razorpay checkout is unavailable.');
  }

  return window.Razorpay;
}

function formatDurationOptionLabel(days: number) {
  if (days >= 30 && days % 30 === 0) {
    const months = days / 30;
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  return `${days} day${days === 1 ? '' : 's'}`;
}


function describePlanBadge(days: number) {
  if (days >= 180) return 'Best for long-term prep';
  if (days >= 90) return 'Most popular';
  return 'Quick access';
}

function describePlanFeatures(days: number) {
  return [
    `${formatDurationOptionLabel(days)} of premium node access`,
    'Covers every premium node in this course',
    days >= 90 ? 'Better value for sustained study' : 'Fastest path to unlock premium lessons',
  ];
}

export function PremiumAccessButton(props: {
  courseId: string;
  baseAccessDays?: number | null;
  resumePurchaseId?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [selectedMultiplier, setSelectedMultiplier] = useState<1 | 3>(1);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (props.resumePurchaseId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await apiJson<{ plans: PricingPlan[] }>(`/api/courses/${props.courseId}/pricing-plans`);
        if (cancelled) return;
        const nextPlans = result.plans ?? [];
        setPlans(nextPlans);
        setSelectedPlanId(nextPlans[0]?.id ?? null);
      } catch {
        if (!cancelled) {
          setPlans([]);
          setSelectedPlanId(null);
        }
      } finally {
        if (!cancelled) {
          setPlansLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.courseId, props.resumePurchaseId]);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId]
  );

  async function verifyPurchase(
    order: PremiumPaymentOrder,
    payload: {
      providerOrderId: string;
      providerPaymentId: string;
      providerSignature: string | null;
    }
  ) {
    const result = await apiJson<{ finalization: PremiumPurchaseFinalization }>(
      `/api/courses/${props.courseId}/premium/verify`,
      {
        method: 'POST',
        body: JSON.stringify({
          purchaseId: order.purchaseId,
          providerOrderId: payload.providerOrderId,
          providerPaymentId: payload.providerPaymentId,
          providerSignature: payload.providerSignature,
        }),
      }
    );

    return result.finalization;
  }

  async function openSandboxFlow(order: PremiumPaymentOrder, settlement: PurchaseSettlement) {
    const finalization = await verifyPurchase(order, {
      providerOrderId: order.providerOrderId,
      providerPaymentId: `sandbox_payment_${crypto.randomUUID()}`,
      providerSignature: null,
    });

    setMessage(
      `${finalization.purchaseKind === 'renewal' ? 'Premium access extended until' : 'Premium access active until'} ${formatDateTimeLabel(finalization.entitlement.expiresAt)}. ${settlement.currency} ${settlement.grossAmount.toFixed(2)} captured.`
    );
    router.refresh();
  }

  async function openRazorpayFlow(order: PremiumPaymentOrder, settlement: PurchaseSettlement) {
    const Razorpay = await loadRazorpayCheckout();

    await new Promise<void>((resolve, reject) => {
      const instance = new Razorpay({
        key: order.checkoutKey,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: 'CS Ranger',
        description: props.label ?? 'Premium course access',
        order_id: order.providerOrderId,
        handler: async (response: {
          razorpay_order_id?: string;
          razorpay_payment_id?: string;
          razorpay_signature?: string;
        }) => {
          try {
            const finalization = await verifyPurchase(order, {
              providerOrderId: response.razorpay_order_id ?? order.providerOrderId,
              providerPaymentId: response.razorpay_payment_id ?? '',
              providerSignature: response.razorpay_signature ?? null,
            });
            setMessage(
              `${finalization.purchaseKind === 'renewal' ? 'Premium access extended until' : 'Premium access active until'} ${formatDateTimeLabel(finalization.entitlement.expiresAt)}. ${settlement.currency} ${settlement.grossAmount.toFixed(2)} captured.`
            );
            router.refresh();
            resolve();
          } catch (caught) {
            reject(caught);
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Payment checkout was dismissed.')),
        },
      });

      instance.on('payment.failed', () => reject(new Error('Payment provider reported a checkout failure.')));
      instance.open();
    });
  }

  function beginPurchase() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const endpoint = props.resumePurchaseId
          ? `/api/premium/purchases/${props.resumePurchaseId}/resume`
          : `/api/courses/${props.courseId}/premium/order`;

        const requestInit: RequestInit = { method: 'POST' };
        if (!props.resumePurchaseId) {
          requestInit.body = JSON.stringify({
            durationMultiplier: selectedMultiplier,
            pricingPlanId: activePlan?.id ?? null,
          });
        }

        const result = await apiJson<{
          order: PremiumPaymentOrder;
          settlement: PurchaseSettlement;
        }>(endpoint, requestInit);

        if (result.order.checkoutMode === 'sandbox') {
          await openSandboxFlow(result.order, result.settlement);
          return;
        }

        await openRazorpayFlow(result.order, result.settlement);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Premium payment could not be completed.');
      }
    });
  }

  return (
    <div className="stack premium-access-purchase-box" style={{ gap: 8 }}>
      {!props.resumePurchaseId ? (
        plansLoaded && plans.length > 0 ? (
          <div className="stack premium-plan-selector-shell" style={{ gap: 12 }}>
            <div className="premium-plan-selector-header">
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">Choose your plan</span>
                <span className="studio-badge studio-badge-muted">Premium access for this course</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>Pick one learner plan. Every plan unlocks premium nodes; only duration and value differ.</p>
            </div>
            <div className="pricing-plan-grid premium-plan-grid-chatgpt" role="radiogroup" aria-label="Premium pricing plans">
              {plans.map((plan) => {
                const active = activePlan?.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    className="pricing-plan-card premium-plan-chatgpt-card"
                    data-active={active}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedPlanId(plan.id)}
                    disabled={pending}
                  >
                    <div className="inline" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                      <div className="stack" style={{ gap: 6 }}>
                        <strong>{plan.title}</strong>
                        <span className="studio-badge studio-badge-muted">{describePlanBadge(plan.access_days)}</span>
                      </div>
                      <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
                        <span className="studio-badge studio-badge-primary">{formatCurrency(Number(plan.price_amount), 'INR')}</span>
                        <span className="tag">{formatDurationOptionLabel(plan.access_days)}</span>
                      </div>
                    </div>
                    <p className="muted" style={{ margin: 0 }}>{plan.description ?? 'Premium access plan'}</p>
                    <ul className="premium-plan-feature-list">
                      {describePlanFeatures(plan.access_days).map((feature) => (
                        <li key={`${plan.id}-${feature}`}>{feature}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="segmented-control" role="radiogroup" aria-label="Subscription duration">
            <button
              type="button"
              className="segmented-control-button"
              data-active={selectedMultiplier === 1}
              role="radio"
              aria-checked={selectedMultiplier === 1}
              onClick={() => setSelectedMultiplier(1)}
              disabled={pending}
            >
              {formatDurationOptionLabel(Math.max(props.baseAccessDays ?? 30, 1))}
            </button>
            <button
              type="button"
              className="segmented-control-button"
              data-active={selectedMultiplier === 3}
              role="radio"
              aria-checked={selectedMultiplier === 3}
              onClick={() => setSelectedMultiplier(3)}
              disabled={pending}
            >
              {formatDurationOptionLabel(Math.max((props.baseAccessDays ?? 30) * 3, 1))}
            </button>
          </div>
        )
      ) : null}
      <Button type="button" onClick={beginPurchase} disabled={pending || (!props.resumePurchaseId && plansLoaded && plans.length > 0 && !activePlan)} className={props.className}>
        {pending ? 'Processing...' : props.label ?? (props.resumePurchaseId ? 'Continue payment' : 'Unlock Premium Nodes')}
      </Button>
      {!props.resumePurchaseId && activePlan ? (
        <div className="premium-selected-plan-callout">
          <strong>Selected plan:</strong> {activePlan.title} · {formatCurrency(Number(activePlan.price_amount), 'INR')} for {activePlan.access_days} days.
        </div>
      ) : null}
      {message ? <div style={{ color: 'var(--success)' }}>{message}</div> : null}
      {message ? (
        <div className="inline">
          <Link href="/dashboard/transactions" className="button button-ghost">
            Open transactions
          </Link>
        </div>
      ) : null}
      {error ? <div style={{ color: 'var(--danger)' }}>{error}</div> : null}
    </div>
  );
}


