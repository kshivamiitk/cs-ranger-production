import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell/AppShell';
import { CreatorStudioNav } from '@/components/creator/CreatorStudioNav';
import type { ThemeMode, Viewer } from '@/src/domain/models';

type CreatorStudioShellProps = {
  viewer: Viewer;
  themeMode: ThemeMode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  headerVariant?: 'hero' | 'compact';
  children: ReactNode;
  unreadCounts?: {
    feed?: number;
    support?: number;
    notifications?: number;
  };
};

export function CreatorStudioShell({
  viewer,
  themeMode,
  title,
  subtitle,
  actions,
  headerVariant = 'compact',
  children,
  unreadCounts,
}: CreatorStudioShellProps) {
  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Creator Studio"
      title={title}
      subtitle={subtitle}
      actions={actions}
      headerVariant={headerVariant}
      unreadCounts={unreadCounts}
    >
      <div className="stack-lg" style={{ width: '100%' }}>
        <CreatorStudioNav />
        {children}
      </div>
    </AppShell>
  );
}


