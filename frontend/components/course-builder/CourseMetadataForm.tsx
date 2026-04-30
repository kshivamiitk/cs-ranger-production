'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Save, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CourseImagePreview } from '@/components/course-builder/CourseImagePreview';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import {
  CREATOR_FREE_COURSE_LIMIT,
  PREMIUM_COURSE_FREE_NODE_LIMIT,
  courseCountsAsFree,
  courseCountsAsPremium,
} from '@/src/domain/creatorCoursePolicy';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';
import { apiJson } from '@/src/presentation/http/client';
import type { CourseStatus } from '@/src/domain/models';

export function CourseMetadataForm(props: {
  mode: 'create' | 'edit';
  courseId?: string;
  initialValues: {
    title: string;
    description: string;
    imageUrl: string;
    domainName: string;
    priceAmount: string;
    premiumEnabled: boolean;
    premiumAccessDays: string;
    premiumNodeCount: number;
    freeNodeCount: number;
    status: CourseStatus;
  };
  creatorPolicy?: {
    freeCourseCount?: number;
    currentCourseCountsAsFree?: boolean;
  };
  submitLabel: string;
  cancelHref: string;
  onSuccessHref: (courseId: string) => string;
  supportingAction?: {
    href: string;
    label: string;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(props.initialValues.title);
  const [description, setDescription] = useState(props.initialValues.description);
  const [imageUrl, setImageUrl] = useState(props.initialValues.imageUrl);
  const [domainName, setDomainName] = useState(props.initialValues.domainName);
  const [priceAmount, setPriceAmount] = useState(props.initialValues.priceAmount);
  const [premiumEnabled, setPremiumEnabled] = useState(props.initialValues.premiumEnabled);
  const [premiumAccessDays, setPremiumAccessDays] = useState(props.initialValues.premiumAccessDays);
  const [status, setStatus] = useState<CourseStatus>(props.initialValues.status);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draftPricing = {
    premiumEnabled,
    priceAmount: Number(priceAmount || '0'),
    premiumAccessDays: premiumEnabled ? Number(premiumAccessDays || '0') : null,
  };
  const premiumPreview = describeCoursePremiumState(draftPricing, props.initialValues.premiumNodeCount);
  const premiumToneClass =
    premiumPreview.tone === 'primary'
      ? 'studio-badge-primary'
      : premiumPreview.tone === 'warning'
        ? 'studio-badge-warning'
        : 'studio-badge-success';

  const previewTitle = useMemo(() => title.trim() || 'Untitled course', [title]);
  const previewDescription = useMemo(
    () => description.trim() || 'Your course cover, title, and short summary update live here.',
    [description]
  );
  const draftCountsAsFree = courseCountsAsFree(draftPricing);
  const draftCountsAsPremium = courseCountsAsPremium(draftPricing);
  const creatorFreeCourseCount = props.creatorPolicy?.freeCourseCount;
  const projectedFreeCourseCount =
    typeof creatorFreeCourseCount === 'number'
      ? creatorFreeCourseCount -
        (props.mode === 'edit' && props.creatorPolicy?.currentCourseCountsAsFree ? 1 : 0) +
        (draftCountsAsFree ? 1 : 0)
      : null;
  const freeCoursePolicyBlocked =
    projectedFreeCourseCount != null && projectedFreeCourseCount > CREATOR_FREE_COURSE_LIMIT;
  const premiumFreeNodePolicyBlocked =
    draftCountsAsPremium && props.initialValues.freeNodeCount > PREMIUM_COURSE_FREE_NODE_LIMIT;
  const submitDisabled = saving || freeCoursePolicyBlocked || premiumFreeNodePolicyBlocked;

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const endpoint =
        props.mode === 'create'
          ? '/api/creator/courses'
          : `/api/creator/courses/${props.courseId}`;

      const method = props.mode === 'create' ? 'POST' : 'PATCH';

      const response = await apiJson<{ course: { id: string } }>(endpoint, {
        method,
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          domainName,
          priceAmount: Number(priceAmount),
          premiumEnabled,
          premiumAccessDays: premiumEnabled ? Number(premiumAccessDays || '30') : null,
          status,
        }),
      });

      router.push(props.onSuccessHref(response.course.id));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Course save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="studio-detail-grid">
      <form className="studio-form-card stack-lg" onSubmit={handleSubmit}>
        <div className="stack" style={{ gap: 10 }}>
          <div className="section-label">Course Metadata</div>
          <h2 className="panel-title" style={{ fontSize: '1.8rem' }}>
            {props.mode === 'create' ? 'Create your course shell' : 'Course details'}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Keep this page focused on course-level information. Modules and nodes are managed from the dedicated authoring route.
          </p>
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-primary">{props.mode === 'create' ? 'New course' : 'Metadata only'}</span>
            <span className={`studio-badge ${status === 'published' ? 'studio-badge-success' : 'studio-badge-muted'}`}>{status}</span>
            <span className={`studio-badge ${premiumToneClass}`}>
              {premiumPreview.label}
            </span>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Course title</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Advanced Calculus for JEE" required />
        </label>

        <label className="field">
          <span className="field-label">Short description</span>
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does the learner get from this course?"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Upload course cover</span>
          <Input type="file" accept="image/*" onChange={handleImageUpload} />
          <span className="field-helper-text">Upload an image directly, or paste an image URL / data URL below.</span>
        </label>

        <label className="field">
          <span className="field-label">Cover image URL or data URL</span>
          <Input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.com/course-cover.jpg"
          />
        </label>

        <label className="field">
          <span className="field-label">Domain</span>
          <Input
            value={domainName}
            onChange={(event) => setDomainName(event.target.value)}
            placeholder="e.g. DSA, Data Science, Machine Learning"
          />
          <span className="field-helper-text">
            Reuse an existing domain by typing its name. New domains are created automatically and deduplicated by normalized name.
          </span>
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="field-label">Premium plan</span>
            <Select
              value={premiumEnabled ? 'enabled' : 'disabled'}
              onChange={(event) => setPremiumEnabled(event.target.value === 'enabled')}
            >
              <option value="disabled">Disabled — all nodes are free</option>
              <option value="enabled">Enabled — lock premium nodes behind a plan</option>
            </Select>
          </label>

          <label className="field">
            <span className="field-label">Premium price</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={priceAmount}
              onChange={(event) => setPriceAmount(event.target.value)}
              disabled={!premiumEnabled}
            />
          </label>
        </div>

        <div className="grid-2">
          <label className="field">
            <span className="field-label">Premium access duration (days)</span>
            <Input
              type="number"
              min="1"
              step="1"
              value={premiumAccessDays}
              onChange={(event) => setPremiumAccessDays(event.target.value)}
              disabled={!premiumEnabled}
            />
          </label>

          <label className="field">
            <span className="field-label">Status</span>
            <Select value={status} onChange={(event) => setStatus(event.target.value as CourseStatus)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </label>
        </div>

        {error ? <div className="studio-inline-alert">{error}</div> : null}
        {premiumPreview.state === 'pricing_incomplete' ? (
          <div className="studio-inline-alert">
            Premium nodes already exist for this course. Finish the premium price and duration before publishing.
          </div>
        ) : null}
        {freeCoursePolicyBlocked ? (
          <div className="studio-inline-alert">
            Free course limit reached. A creator can keep at most {CREATOR_FREE_COURSE_LIMIT} free courses; enable premium pricing or convert an existing free course first.
          </div>
        ) : null}
        {premiumFreeNodePolicyBlocked ? (
          <div className="studio-inline-alert">
            Premium courses can expose at most {PREMIUM_COURSE_FREE_NODE_LIMIT} free nodes. This course has {props.initialValues.freeNodeCount}; mark extra nodes as premium before saving this plan.
          </div>
        ) : null}

        <div className="inline">
          <Button type="submit" disabled={submitDisabled}>
            <Save size={16} />
            {saving ? 'Saving...' : props.submitLabel}
          </Button>
          {props.supportingAction ? (
            <Link href={props.supportingAction.href} className="button button-secondary">
              <Settings2 size={16} />
              {props.supportingAction.label}
            </Link>
          ) : null}
          <Link href={props.cancelHref} className="button button-ghost">
            Cancel
          </Link>
        </div>
      </form>

      <aside className="studio-preview-card stack-lg">
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-primary">
            <ImageIcon size={14} />
            Live preview
          </span>
          <span className={`studio-badge ${status === 'published' ? 'studio-badge-success' : 'studio-badge-muted'}`}>
            {status}
          </span>
        </div>

        <CourseImagePreview
          title={previewTitle}
          description={previewDescription}
          imageUrl={imageUrl.trim() ? imageUrl.trim() : null}
          badge={status === 'published' ? 'Published' : 'Draft'}
        />

        {domainName.trim() ? (
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-muted">Domain</span>
            <span className="studio-badge studio-badge-primary">{domainName.trim()}</span>
          </div>
        ) : null}

        <div className="card stack" style={{ gap: 12 }}>
          <div>
            <div className="field-label">Preview notes</div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              {premiumPreview.helper} This legacy pricing configuration still acts as a fallback. For learner-facing multi-plan pricing, open Course Account and create manual pricing schemes such as 30, 90, and 180 day access plans.
            </p>
          </div>
          <div className="inline premium-badge-row">
            <span className={`studio-badge ${premiumToneClass}`}>
              {premiumPreview.label}
            </span>
            <span className={`studio-badge ${status === 'published' ? 'studio-badge-success' : 'studio-badge-muted'}`}>{status}</span>
            <span className="studio-badge studio-badge-muted">
              {props.initialValues.premiumNodeCount} premium node{props.initialValues.premiumNodeCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <div>
            <div className="field-label">Creator policy</div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Creators can keep up to {CREATOR_FREE_COURSE_LIMIT} free courses. Premium courses can expose up to {PREMIUM_COURSE_FREE_NODE_LIMIT} free nodes as previews.
            </p>
          </div>
          <div className="inline premium-badge-row">
            {projectedFreeCourseCount != null ? (
              <span className={`studio-badge ${freeCoursePolicyBlocked ? 'studio-badge-warning' : 'studio-badge-muted'}`}>
                Free courses after save: {projectedFreeCourseCount}/{CREATOR_FREE_COURSE_LIMIT}
              </span>
            ) : null}
            <span className={`studio-badge ${premiumFreeNodePolicyBlocked ? 'studio-badge-warning' : 'studio-badge-muted'}`}>
              Free nodes in this course: {props.initialValues.freeNodeCount}/{PREMIUM_COURSE_FREE_NODE_LIMIT}
            </span>
          </div>
        </div>
      </aside>
    </section>
  );
}
