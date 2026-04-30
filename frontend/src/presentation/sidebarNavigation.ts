import type { Viewer } from '@/src/domain/models';

export type SidebarMode = 'learner' | 'creator' | 'admin';

export type SidebarIconKey =
  | 'home'
  | 'book-open'
  | 'bookmark'
  | 'bookmark-check'
  | 'search'
  | 'users'
  | 'message-square-text'
  | 'layout-dashboard'
  | 'graduation-cap'
  | 'plus-circle'
  | 'shield'
  | 'wallet-cards'
  | 'sliders'
  | 'banknote'
  | 'receipt'
  | 'award'
  | 'rss'
  | 'flame'
  | 'radio'
  | 'award';

export interface SidebarNavItem {
  href: string;
  label: string;
  description: string;
  icon: SidebarIconKey;
}

export interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

export interface SidebarNavigationModel {
  mode: SidebarMode;
  workspaceLabel: string;
  workspaceDescription: string;
  groups: SidebarNavGroup[];
}

function routeStartsWith(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function resolveSidebarMode(pathname: string): SidebarMode {
  if (routeStartsWith(pathname, '/creator')) {
    return 'creator';
  }

  if (routeStartsWith(pathname, '/admin')) {
    return 'admin';
  }

  return 'learner';
}

export function buildSidebarNavigation(input: {
  pathname: string;
  viewer: Viewer | null;
}): SidebarNavigationModel {
  const mode = resolveSidebarMode(input.pathname);

  if (mode === 'creator') {
    return {
      mode,
      workspaceLabel: 'Creator Studio',
      workspaceDescription: 'Creator routes for course authoring, balances, and withdrawals.',
      groups: [
        {
          title: 'Creator',
          items: [
            {
              href: '/creator/dashboard',
              label: 'Creator Dashboard',
              description: 'Balances, settlements, and withdrawals',
              icon: 'layout-dashboard',
            },
            {
              href: '/creator/courses',
              label: 'My Courses',
              description: 'Published and draft creator library',
              icon: 'graduation-cap',
            },
            {
              href: '/creator/learner-doubts',
              label: 'Doubts',
              description: 'Top-level comments tagged as doubt in your courses',
              icon: 'message-square-text',
            },
            {
              href: '/creator/courses/new',
              label: 'New Course',
              description: 'Create a new premium course shell',
              icon: 'plus-circle',
            },
          ],
        },
        ...(input.viewer?.profile.isAdmin
          ? [
              {
                title: 'Admin',
                items: [
                  {
                    href: '/admin',
                    label: 'Open admin dashboard',
                    description: 'Switch to admin workspace and admin sidebar',
                    icon: 'shield',
                  },
                ],
              } satisfies SidebarNavGroup,
            ]
          : []),
      ],
    };
  }

  if (mode === 'admin') {
    return {
      mode,
      workspaceLabel: 'Admin Operations',
      workspaceDescription: 'Finance, payouts, certificates, and moderation — each on its own page.',
      groups: [
        {
          title: 'Overview',
          items: [
            {
              href: '/admin',
              label: 'Overview',
              description: 'KPI snapshot and shortcuts',
              icon: 'layout-dashboard',
            },
          ],
        },
        {
          title: 'Finance & payouts',
          items: [
            {
              href: '/admin/finance-settings',
              label: 'Finance settings',
              description: 'Platform fee, minimum withdrawal, settlement hold',
              icon: 'sliders',
            },
            {
              href: '/admin/creator-payouts',
              label: 'Creator payouts',
              description: 'Balances owed, payout queue, mark paid',
              icon: 'banknote',
            },
            {
              href: '/admin/bulk-payouts',
              label: 'Bulk payouts',
              description: 'Preview and run Tuesday-style creator batches',
              icon: 'wallet-cards',
            },
            {
              href: '/admin/transactions',
              label: 'Premium transactions',
              description: 'Recent purchases and revenue splits',
              icon: 'receipt',
            },
          ],
        },
        {
          title: 'Trust & community',
          items: [
            {
              href: '/admin/certificates',
              label: 'Issued certificates',
              description: 'Learner certificates across courses',
              icon: 'award',
            },
            {
              href: '/admin/support',
              label: 'Support inbox',
              description: 'Suggestions, complaints, and support',
              icon: 'message-square-text',
            },
            {
              href: '/admin/broadcasts',
              label: 'Broadcasts',
              description: 'Platform-wide notification campaigns',
              icon: 'radio',
            },
          ],
        },
      ],
    };
  }

  if (!input.viewer) {
    return {
      mode,
      workspaceLabel: 'Guest Workspace',
      workspaceDescription: 'Browse public learning routes and sign in when ready.',
      groups: [
        {
          title: 'Primary',
          items: [
            {
              href: '/courses',
              label: 'Learn',
              description: 'Published courses and workspace previews',
              icon: 'book-open',
            },
            {
              href: '/search',
              label: 'Search',
              description: 'Find courses, nodes, and creators',
              icon: 'search',
            },
          ],
        },
      ],
    };
  }

  return {
    mode,
    workspaceLabel: 'Learner Workspace',
    workspaceDescription: 'Learning-first navigation with isolated creator/admin workspaces.',
    groups: [
      {
        title: 'Primary',
        items: [
          {
            href: '/dashboard',
            label: 'Home',
            description: 'Learner overview and quick actions',
            icon: 'home',
          },
          {
            href: '/courses',
            label: 'Learn',
            description: 'Catalog, trees, and node readers',
            icon: 'book-open',
          },
          {
            href: '/dashboard/feed',
            label: 'Feed',
            description: 'New courses, modules, and nodes from creators you follow',
            icon: 'rss',
          },
          {
            href: '/dashboard/access',
            label: 'Access Center',
            description: 'Expiry watchlist, renewals, and pending premium access',
            icon: 'flame',
          },
          {
            href: '/dashboard/report-card',
            label: 'Report Card',
            description: 'Best quiz scores, attempts, and progress by course',
            icon: 'award',
          },
          {
            href: '/dashboard/bookmarks',
            label: 'Bookmarks',
            description: 'Saved nodes for future study',
            icon: 'bookmark',
          },
          {
            href: '/dashboard/wishlist',
            label: 'Wishlist',
            description: 'Saved courses for later review',
            icon: 'bookmark-check',
          },
          {
            href: '/search',
            label: 'Search',
            description: 'Courses, modules, nodes, and creators',
            icon: 'search',
          },
          {
            href: '/dashboard/creators',
            label: 'Top Creators',
            description: 'Open follower or contribution leaderboards',
            icon: 'users',
          },
          {
            href: '/dashboard/transactions',
            label: 'Transactions',
            description: 'Payment history and pending premium checkouts',
            icon: 'wallet-cards',
          },
          {
            href: '/dashboard/support',
            label: 'Contact Admin',
            description: 'Suggestions, complaints, and support',
            icon: 'message-square-text',
          },
        ],
      },
      ...(input.viewer.profile.primaryRole === 'creator'
        ? [
            {
              title: 'Creator',
              items: [
                {
                  href: '/creator/dashboard',
                  label: 'Open creator dashboard',
                  description: 'Switch to creator sidebar and creator workspace',
                  icon: 'layout-dashboard',
                },
              ],
            } satisfies SidebarNavGroup,
          ]
        : []),
      ...(input.viewer.profile.isAdmin
        ? [
            {
              title: 'Admin',
              items: [
                {
                  href: '/admin',
                  label: 'Open admin dashboard',
                  description: 'Switch to admin workspace and admin sidebar',
                  icon: 'shield',
                },
              ],
            } satisfies SidebarNavGroup,
          ]
        : []),
    ],
  };
}

