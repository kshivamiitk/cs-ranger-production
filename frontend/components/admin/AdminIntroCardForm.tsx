"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { apiJson } from '@/src/presentation/http/client';
import { AdminIntroCardPreview, type AdminIntroImageFocus } from '@/components/admin/AdminIntroCardPreview';

const focusPresets: { value: AdminIntroImageFocus; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'center-left', label: 'Center left' },
  { value: 'center', label: 'Center' },
  { value: 'center-right', label: 'Center right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'bottom-right', label: 'Bottom right' },
];

export function AdminIntroCardForm(props: {
  initialValues?: {
    title: string;
    body: string;
    imageUrl: string;
    imageFocus: AdminIntroImageFocus;
    ctaLabel: string;
    ctaHref: string;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(props.initialValues?.title ?? 'Welcome to CS Ranger');
  const [body, setBody] = useState(props.initialValues?.body ?? 'Admins can feature a public onboarding card here for new learners and creators.');
  const [imageUrl, setImageUrl] = useState(props.initialValues?.imageUrl ?? '');
  const [imageFocus, setImageFocus] = useState<AdminIntroImageFocus>(props.initialValues?.imageFocus ?? 'center');
  const [ctaLabel, setCtaLabel] = useState(props.initialValues?.ctaLabel ?? 'Explore courses');
  const [ctaHref, setCtaHref] = useState(props.initialValues?.ctaHref ?? '/courses');
  const [isActive, setIsActive] = useState(props.initialValues?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await apiJson('/api/admin/intro-card', { method: 'POST', body: JSON.stringify({ title, body, imageUrl, imageFocus, ctaLabel, ctaHref, isActive }) });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to save intro card.');
      }
    });
  }

  return (
    <section className="admin-intro-builder-grid">
      <form className="panel stack-lg" onSubmit={handleSubmit}>
        <div className="stack-gap-8">
          <h2 className="panel-title text-no-margin">Public admin intro card</h2>
          <p className="muted text-no-margin">This card appears on the login/signup experience for new visitors.</p>
        </div>

        <label className="field">
          <span className="field-label">Title</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Body</span>
          <textarea className="input textarea-resize-vertical" rows={6} value={body} onChange={(event) => setBody(event.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Upload image</span>
          <input className="input" type="file" accept="image/*" onChange={handleImageUpload} />
        </label>

        <label className="field">
          <span className="field-label">Or image URL / data URL</span>
          <input className="input" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        </label>

        {imageUrl ? (
          <div className="admin-intro-focus-shell">
            <div className="stack-gap-8">
              <h3 className="panel-title text-no-margin">Choose visible area</h3>
              <p className="muted text-no-margin">Move the focus ring to choose which part of the image stays inside the card frame.</p>
            </div>
            <div className="admin-intro-focus-stage">
              <img src={imageUrl} alt="Selected intro card image" className={`admin-intro-focus-image admin-intro-image-focus-${imageFocus}`} />
              <div className={`admin-intro-focus-ring admin-intro-focus-ring-${imageFocus}`} />
              <div className="admin-intro-focus-grid">
                {focusPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    aria-label={`Focus ${preset.label}`}
                    className="admin-intro-focus-target"
                    onClick={() => setImageFocus(preset.value)}
                  />
                ))}
              </div>
            </div>
            <div className="admin-intro-focus-controls">
              {focusPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={preset.value === imageFocus ? 'button button-ghost admin-intro-focus-preset-button is-active' : 'button button-ghost admin-intro-focus-preset-button'}
                  onClick={() => setImageFocus(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid-2">
          <label className="field">
            <span className="field-label">CTA label</span>
            <input className="input" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">CTA href</span>
            <input className="input" value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} />
          </label>
        </div>

        <label className="field inline admin-intro-checkbox-row">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          <span className="field-label field-label-inline">Set as active featured card</span>
        </label>

        {error ? <div className="form-feedback-error">{error}</div> : null}

        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Saving...' : 'Save intro card'}
        </button>
      </form>

      <section className="panel stack-lg">
        <div className="stack-gap-8">
          <h2 className="panel-title text-no-margin">Live preview</h2>
          <p className="muted text-no-margin">This uses the same public card shell shown to visitors on the login screen.</p>
        </div>
        <AdminIntroCardPreview
          card={{
            title,
            body,
            imageUrl,
            imageFocus,
            ctaLabel,
            ctaHref,
            isActive,
          }}
          showStateBadge
        />
      </section>
    </section>
  );
}


