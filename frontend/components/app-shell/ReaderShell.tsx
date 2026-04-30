import type { PropsWithChildren, ReactNode } from 'react';
import Link from 'next/link';

import { BrandSymbol } from '@/components/brand/BrandSymbol';

export function ReaderShell(props: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showHero?: boolean;
  hideTopbar?: boolean;
  sidebar?: ReactNode;
}>) {
  return (
    <div className="reader-shell">
      <div className="reader-shell-backdrop" />
      <main className="reader-shell-main">
        {props.hideTopbar ? null : (
          <header className="reader-shell-topbar">
            <Link href="/courses" className="reader-shell-brand">
              <BrandSymbol size="sm" />
              <div className="reader-shell-brand-copy">
                <span className="section-label">{props.eyebrow ?? 'CS Ranger'}</span>
                <strong className="reader-shell-brand-title">Focused node reader</strong>
              </div>
            </Link>
            {props.actions ? <div className="reader-shell-actions">{props.actions}</div> : null}
          </header>
        )}

        {props.showHero === false ? null : (
          <section className="reader-shell-hero">
            <div className="stack" style={{ gap: 10 }}>
              <div className="section-label">{props.eyebrow ?? 'Node reading mode'}</div>
              <h1 className="headline">{props.title}</h1>
              {props.subtitle ? <p className="subheadline">{props.subtitle}</p> : null}
            </div>
          </section>
        )}

        <div className={`reader-shell-layout${props.sidebar ? ' has-sidebar' : ''}`}>
          {props.sidebar ? <div className="reader-shell-sidebar">{props.sidebar}</div> : null}
          <div className="reader-shell-content">{props.children}</div>
        </div>
      </main>
    </div>
  );
}

