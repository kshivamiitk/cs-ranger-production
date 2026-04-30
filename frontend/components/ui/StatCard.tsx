import type { ReactNode } from 'react';

export function StatCard(props: {
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="stat-card">
      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <span className="stat-label">{props.label}</span>
        {props.icon}
      </div>
      <strong className="stat-value">{props.value}</strong>
      {props.helper ? <div className="muted">{props.helper}</div> : null}
    </article>
  );
}


