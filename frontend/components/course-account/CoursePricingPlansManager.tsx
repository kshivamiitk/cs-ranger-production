'use client';

import { useEffect, useMemo, useState } from 'react';

import { ClientListPaginationControls } from '@/components/ui/ClientListPaginationControls';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { apiJson } from '@/src/presentation/http/client';
import { formatCurrency } from '@/lib/utils';

type PricingPlan = {
  id: string;
  title: string;
  description: string | null;
  price_amount: number;
  access_days: number;
  position: number;
  is_active: boolean;
};

export function CoursePricingPlansManager(props: { courseId: string; currency?: string; standalone?: boolean }) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', description: '', priceAmount: '10', accessDays: '30' });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<10 | 50 | 100>(10);

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiJson<{ plans: PricingPlan[] }>(`/api/creator/courses/${props.courseId}/pricing-plans`);
      const nextPlans = response.plans ?? [];
      setPlans(nextPlans);
      setPage((current) => Math.min(Math.max(current, 1), Math.max(1, Math.ceil(nextPlans.length / size))));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pricing schemes could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, [props.courseId]);

  const summary = useMemo(() => {
    if (plans.length === 0) return 'No pricing schemes yet.';
    return plans
      .map((plan) => `${formatCurrency(Number(plan.price_amount), props.currency ?? 'INR')} for ${plan.access_days} days`)
      .join(' · ');
  }, [plans, props.currency]);


  const totalItems = plans.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * size;
  const endIndex = Math.min(startIndex + size, totalItems);
  const visiblePlans = plans.slice(startIndex, endIndex);

  async function createPlan() {
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/creator/courses/${props.courseId}/pricing-plans`, {
        method: 'POST',
        body: JSON.stringify({
          title: draft.title,
          description: draft.description || null,
          priceAmount: Number(draft.priceAmount),
          accessDays: Number(draft.accessDays),
        }),
      });
      setDraft({ title: '', description: '', priceAmount: '10', accessDays: '30' });
      setPage(1);
      await loadPlans();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pricing scheme could not be created.');
    } finally {
      setSaving(false);
    }
  }

  async function archivePlan(planId: string) {
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/creator/courses/${props.courseId}/pricing-plans/${planId}`, { method: 'DELETE' });
      await loadPlans();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pricing scheme could not be removed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel stack-lg course-account-section">
      <div className="stack" style={{ gap: 10 }}>
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-primary">Manual pricing schemes</span>
          <span className="studio-badge studio-badge-muted">Learners choose one plan before checkout</span>
        </div>
        <div>
          <h2 className="panel-title" style={{ marginBottom: 8 }}>Course pricing schemes</h2>
          <p className="muted" style={{ margin: 0 }}>
            Add multiple access plans like ₹10 for 30 days, ₹25 for 90 days, and ₹40 for 180 days. These plans are now shown during premium purchase instead of the older multiplier-only chooser.
          </p>
        </div>
        <p className="muted" style={{ margin: 0 }}>{summary}</p>
      </div>

      <div className={props.standalone ? 'stack-lg' : 'course-account-grid'}>
        <div className="card stack" style={{ gap: 12 }}>
          <div>
            <div className="field-label">Create a pricing scheme</div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Keep titles clear and learner-friendly so the purchase dialog stays simple on mobile.
            </p>
          </div>
          <Input placeholder="30 day starter plan" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          <TextArea placeholder="Ideal for quick revision batches." value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
          <div className="grid-2">
            <Input type="number" min="0" step="0.01" value={draft.priceAmount} onChange={(event) => setDraft((current) => ({ ...current, priceAmount: event.target.value }))} />
            <Input type="number" min="1" step="1" value={draft.accessDays} onChange={(event) => setDraft((current) => ({ ...current, accessDays: event.target.value }))} />
          </div>
          <Button type="button" onClick={() => void createPlan()} disabled={saving}>Add pricing scheme</Button>
        </div>

        <div className="stack" style={{ gap: 12 }}>
          <ClientListPaginationControls
            page={safePage}
            size={size}
            totalItems={totalItems}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            noun="plans"
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize as 10 | 50 | 100);
              setPage(1);
            }}
          />
          {loading ? <div className="card">Loading pricing schemes…</div> : null}
          {!loading && plans.length === 0 ? <div className="empty-state">No active pricing schemes yet.</div> : null}
          {visiblePlans.map((plan) => (
            <div key={plan.id} className="card stack" style={{ gap: 10 }}>
              <div className="panel-header">
                <div>
                  <strong>{plan.title}</strong>
                  <p className="muted" style={{ margin: '6px 0 0' }}>{plan.description ?? 'No description added.'}</p>
                </div>
                <span className="studio-badge studio-badge-primary">
                  {formatCurrency(Number(plan.price_amount), props.currency ?? 'INR')} · {plan.access_days} days
                </span>
              </div>
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-muted">Order {plan.position}</span>
                <Button type="button" variant="ghost" onClick={() => void archivePlan(plan.id)} disabled={saving}>Archive</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? <div className="studio-inline-alert">{error}</div> : null}
    </section>
  );
}


