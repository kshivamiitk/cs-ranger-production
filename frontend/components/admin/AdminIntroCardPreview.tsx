export type AdminIntroImageFocus =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type AdminIntroPreviewCard = {
  title: string;
  body: string;
  imageUrl: string;
  imageFocus?: AdminIntroImageFocus;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
};

export function AdminIntroCardPreview(props: {
  card: AdminIntroPreviewCard;
  eyebrow?: string;
  showStateBadge?: boolean;
}) {
  const { card } = props;
  const imageFocusClass = `admin-intro-image-focus-${card.imageFocus ?? 'center'}`;

  return (
    <article className="admin-intro-preview-card">
      <div className="admin-intro-preview-copy stack-gap-10">
        <div className="admin-intro-preview-header-row">
          <span className="tag auth-story-tag">{props.eyebrow ?? "Admin's view"}</span>
          {props.showStateBadge ? (
            <span className={card.isActive ? 'studio-badge studio-badge-primary' : 'studio-badge studio-badge-muted'}>
              {card.isActive ? 'active' : 'draft'}
            </span>
          ) : null}
        </div>
        <h2 className="auth-trust-title text-no-margin">{card.title || 'Welcome to CS Ranger'}</h2>
        <p className="auth-trust-copy text-no-margin">
          {card.body || 'Admins can feature a public onboarding card here for new learners and creators.'}
        </p>
      </div>

      {card.imageUrl ? (
        <img src={card.imageUrl} alt={card.title || 'Admin intro preview'} className={`admin-intro-preview-image ${imageFocusClass}`} />
      ) : (
        <div className="admin-intro-preview-image admin-intro-preview-image-empty">
          <span>No preview image selected</span>
        </div>
      )}

      {card.ctaLabel && card.ctaHref ? (
        <a href={card.ctaHref} className="button button-secondary">
          {card.ctaLabel}
        </a>
      ) : null}
    </article>
  );
}


