import type { Viewer } from '@/src/domain/models';

export type AppNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
};

export type SettingsNavSection = {
  title: string;
  items: AppNavItem[];
};

function routeStartsWith(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export type AppShellMode = 'learner' | 'creator' | 'admin';

export function resolveAppShellMode(pathname: string): AppShellMode {
  if (routeStartsWith(pathname, '/creator')) {
    return 'creator';
  }
  if (routeStartsWith(pathname, '/admin')) {
    return 'admin';
  }
  return 'learner';
}

export function buildPrimaryNavigation(input: {
  pathname: string;
  viewer: Viewer | null;
}): AppNavItem[] {
  const mode = resolveAppShellMode(input.pathname);

  if (mode === 'creator') {
    return [
      { href: '/creator/dashboard', label: 'Overview' },
      { href: '/creator/courses', label: 'Courses' },
      { href: '/creator/learner-doubts', label: 'Doubts' },
      { href: '/creator/dashboard/finance', label: 'Finance' },
      { href: '/creator/dashboard/certificates', label: 'Certificates' },
    ];
  }

  if (mode === 'admin') {
    return [
      { href: '/admin', label: 'Overview' },
      { href: '/admin/creator-payouts', label: 'Payouts' },
      { href: '/admin/transactions', label: 'Transactions' },
      { href: '/admin/support', label: 'Support' },
      { href: '/admin/finance-settings', label: 'Settings' },
    ];
  }

  if (!input.viewer) {
    return [
      { href: '/courses', label: 'Courses' },
      { href: '/creators', label: 'Creators' },
      { href: '/search', label: 'Search' },
    ];
  }

  return [
    { href: '/dashboard', label: 'Home' },
    { href: '/courses', label: 'Learning' },
    { href: '/dashboard/feed', label: 'Feed' },
    { href: '/dashboard/following', label: 'Following' },
    { href: '/dashboard/achievements', label: 'Achievements', shortLabel: 'Awards' },
  ];
}

export function getInlineNavLimit(pathname: string) {
  const mode = resolveAppShellMode(pathname);
  if (mode === 'learner') {
    return 5;
  }
  if (mode === 'admin') {
    return 4;
  }
  return 5;
}

function dedupeItems(items: AppNavItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) {
      return false;
    }
    seen.add(item.href);
    return true;
  });
}

export function buildSettingsNavigation(input: {
  pathname: string;
  viewer: Viewer | null;
}): SettingsNavSection[] {
  const mode = resolveAppShellMode(input.pathname);
  const primaryNav = buildPrimaryNavigation(input);
  const inlineNavLimit = getInlineNavLimit(input.pathname);
  const overflowPrimaryItems = primaryNav.slice(inlineNavLimit);

  const workspaceItems = dedupeItems(
    [
      input.viewer ? { href: '/dashboard', label: 'Learner dashboard' } : null,
      input.viewer?.profile.primaryRole === 'creator' ? { href: '/creator/dashboard', label: 'Creator dashboard' } : null,
      input.viewer?.profile.isAdmin ? { href: '/admin', label: 'Admin console' } : null,
    ].filter((item): item is AppNavItem => item !== null)
  );

  const learnerFeatureItems =
    mode === 'learner' && input.viewer
      ? [
          { href: '/dashboard/profile', label: 'Profile settings' },
          { href: '/dashboard/following', label: 'Following creators' },
          { href: '/dashboard/achievements', label: 'Achievements' },
          { href: '/dashboard/bookmarks', label: 'Bookmarks' },
          { href: '/dashboard/feed', label: 'Feed' },
          { href: '/dashboard/support', label: 'Contact admin' },
        ]
      : [];

  const creatorFeatureItems =
    mode === 'creator'
      ? [
          { href: '/creator/courses', label: 'Course studio' },
          { href: '/creator/dashboard/certificates', label: 'Certificates' },
          { href: '/creator/dashboard/finance', label: 'Finance controls' },
          { href: '/creator/dashboard/support', label: 'Support' },
        ]
      : [];

  const adminFeatureItems =
    mode === 'admin'
      ? [
          { href: '/admin/transactions', label: 'Premium transactions' },
          { href: '/admin/creator-payouts', label: 'Creator payouts' },
          { href: '/admin/bulk-payouts', label: 'Bulk payouts' },
          { href: '/admin/support', label: 'Support inbox' },
          { href: '/admin/finance-settings', label: 'Finance settings' },
          { href: '/admin/certificates', label: 'Issued certificates' },
          { href: '/admin/intro-card', label: 'Admin intro card' },
          { href: '/admin/broadcasts', label: 'Broadcasts' },
        ]
      : [];

  const featureItems = dedupeItems([
    ...overflowPrimaryItems,
    ...learnerFeatureItems,
    ...creatorFeatureItems,
    ...adminFeatureItems,
  ]);

  return [
    { title: 'Workspaces', items: workspaceItems },
    { title: 'Features', items: featureItems },
  ].filter((section) => section.items.length > 0);
}

export function getUtilityRoutes(input: {
  pathname: string;
  viewer: Viewer | null;
}): {
  notificationsHref: string;
  messagesHref: string;
  profileHref: string;
  searchHref: string;
} {
  const mode = resolveAppShellMode(input.pathname);

  if (mode === 'creator') {
    return {
      notificationsHref: '/creator/dashboard/notifications',
      messagesHref: '/creator/dashboard/support',
      profileHref: '/dashboard/profile',
      searchHref: '/search',
    };
  }

  if (mode === 'admin') {
    return {
      notificationsHref: '/admin/notifications',
      messagesHref: '/admin/support',
      profileHref: '/dashboard/profile',
      searchHref: '/search',
    };
  }

  return {
    notificationsHref: input.viewer ? '/dashboard/notifications' : '/login',
    messagesHref: input.viewer ? '/dashboard/support' : '/login',
    profileHref: input.viewer ? '/dashboard/profile' : '/login',
    searchHref: '/search',
  };
}


