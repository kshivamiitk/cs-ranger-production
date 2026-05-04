export function AppRouteLoading(props: {
  label?: string;
  description?: string;
}) {
  return (
    <main className="route-loading-shell" role="status" aria-live="polite">
      <section className="route-loading-card">
        <div className="route-loading-orb" aria-hidden="true" />
        <div className="route-loading-copy">
          <p className="route-loading-eyebrow">CS Ranger</p>
          <h1>{props.label ?? 'Loading workspace'}</h1>
          <p>{props.description ?? 'Fetching the latest data. This usually takes a moment.'}</p>
        </div>
        <div className="route-loading-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
