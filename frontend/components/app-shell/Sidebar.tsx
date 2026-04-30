'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Award,
  Banknote,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  PlusCircle,
  Radio,
  Receipt,
  Rss,
  Flame,
  Search,
  Shield,
  SlidersHorizontal,
  UserCircle2,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

import { cn, firstName } from '@/lib/utils';
import type { ThemeMode, Viewer } from '@/src/domain/models';
import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { ThemeSwitcher } from '@/components/app-shell/ThemeSwitcher';
import { buildSidebarNavigation } from '@/src/presentation/sidebarNavigation';

const sidebarGroupStateStorageKey = 'csr.sidebar.group-open-state';

interface SidebarProps {
  viewer: Viewer | null;
  themeMode: ThemeMode;
  desktopCollapsed: boolean;
  desktopHidden: boolean;
  desktopWidth: number;
  mobileOpen: boolean;
  isMobileViewport: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onDesktopCollapseToggle: () => void;
  onDesktopHide: () => void;
  onDesktopResizeStart: (pointerStartX: number) => void;
}

export function Sidebar({
  viewer,
  themeMode,
  desktopCollapsed,
  desktopHidden,
  desktopWidth,
  mobileOpen,
  isMobileViewport,
  onMobileOpenChange,
  onDesktopCollapseToggle,
  onDesktopHide,
  onDesktopResizeStart,
}: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const isCollapsed = desktopCollapsed && !isMobileViewport && !desktopHidden;
  const navigation = buildSidebarNavigation({ pathname, viewer });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const navigationGroupSignature = `${navigation.mode}:${navigation.groups.map((group) => group.title).join('|')}`;
  const homeHref =
    navigation.mode === 'creator'
      ? '/creator/dashboard'
      : navigation.mode === 'admin'
        ? '/admin'
        : viewer
          ? '/dashboard'
          : '/courses';
  const iconMap = {
    home: Home,
    'book-open': BookOpen,
    bookmark: Bookmark,
    'bookmark-check': BookmarkCheck,
    search: Search,
    users: Users,
    'message-square-text': MessageSquareText,
    'layout-dashboard': LayoutDashboard,
    'graduation-cap': GraduationCap,
    'plus-circle': PlusCircle,
    shield: Shield,
    'wallet-cards': WalletCards,
    sliders: SlidersHorizontal,
    banknote: Banknote,
    receipt: Receipt,
    award: Award,
    rss: Rss,
    flame: Flame,
    radio: Radio,
  } as const;

  useEffect(() => {
    onMobileOpenChange(false);
  }, [pathname, onMobileOpenChange]);

  const navHrefs = navigation.groups.flatMap((group) => group.items.map((item) => item.href));

  const isActive = (href: string) => {
    const matches = navHrefs.filter((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
    if (matches.length === 0) {
      return false;
    }

    const mostSpecific = matches.reduce((selected, candidate) =>
      candidate.length > selected.length ? candidate : selected
    );

    return mostSpecific === href;
  };

  const groupStateKey = (title: string) => `${navigation.mode}:${title}`;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedState = (() => {
      try {
        const raw = window.localStorage.getItem(sidebarGroupStateStorageKey);
        return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      } catch {
        return {};
      }
    })();

    const nextState = navigation.groups.reduce<Record<string, boolean>>((accumulator, group, index) => {
      const key = groupStateKey(group.title);
      const hasActiveItem = group.items.some((item) => isActive(item.href));
      const storedValue = storedState[key];
      accumulator[key] = hasActiveItem || (storedValue ?? index === 0);
      return accumulator;
    }, {});

    setExpandedGroups(nextState);
  }, [navigation.mode, navigationGroupSignature, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || isCollapsed) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(sidebarGroupStateStorageKey);
      const previous = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      window.localStorage.setItem(
        sidebarGroupStateStorageKey,
        JSON.stringify({ ...previous, ...expandedGroups })
      );
    } catch {
      // Ignore sidebar preference persistence failures.
    }
  }, [expandedGroups, isCollapsed]);

  return (
    <>
      <button
        type="button"
        className="sidebar-scrim"
        aria-hidden={!mobileOpen}
        data-open={mobileOpen}
        onClick={() => onMobileOpenChange(false)}
      />

      <aside
        className="sidebar"
        data-open={mobileOpen}
        data-collapsed={isCollapsed}
        data-hidden={desktopHidden && !isMobileViewport}
      >
        <div className="sidebar-top-region">
          <div className="sidebar-control-row" data-collapsed={isCollapsed}>
            <button
              type="button"
              className="sidebar-close"
              aria-label="Close navigation"
              onClick={() => {
                if (isMobileViewport) {
                  onMobileOpenChange(false);
                  return;
                }

                onDesktopHide();
              }}
            >
              <X size={18} />
            </button>

            {!isMobileViewport ? (
              <button
                type="button"
                className="sidebar-desktop-collapse"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={onDesktopCollapseToggle}
              >
                {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            ) : null}
          </div>

          <div className="sidebar-brand-row">
            <Link href={homeHref} className="sidebar-brand-home" aria-label="Go to CS Ranger home">
              <BrandSymbol className="sidebar-brand-mark" />
            </Link>
            <Link href={homeHref} className="sidebar-brand" data-hidden={isCollapsed}>
              <span className="tag">CS Ranger</span>
              <div className="sidebar-brand-title">
                {viewer ? `Welcome ${firstName(viewer.profile.fullName ?? viewer.user.fullName)}` : 'CS Ranger'}
              </div>
              <div className="sidebar-copy">
                {viewer
                  ? navigation.workspaceDescription
                  : 'Premium learning, creator tools, and structured course flows.'}
              </div>
            </Link>
          </div>

        </div>

        <div className="sidebar-nav-scroll">
          {navigation.groups.map((group, index) => {
            const key = groupStateKey(group.title);
            const isExpanded = isCollapsed ? true : expandedGroups[key] ?? index === 0;

            return (
              <div className="nav-section" key={group.title} data-collapsed={isCollapsed} data-expanded={isExpanded}>
                {isCollapsed ? (
                  <div className="section-label nav-section-label">{group.title}</div>
                ) : (
                  <button
                    type="button"
                    className="nav-section-toggle"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedGroups((current) => ({
                        ...current,
                        [key]: !isExpanded,
                      }))
                    }
                  >
                    <span className="section-label nav-section-label">{group.title}</span>
                    <span className="nav-section-toggle-count">{group.items.length}</span>
                    <ChevronDown size={16} className="nav-section-toggle-chevron" data-expanded={isExpanded} />
                  </button>
                )}
                <div className="nav-section-body" hidden={!isExpanded && !isCollapsed}>
                  {group.items.map((item) => {
                    const Icon = iconMap[item.icon];

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn('nav-link')}
                        data-active={isActive(item.href)}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <span className="nav-link-icon">
                          <Icon size={18} />
                        </span>
                        <span className="nav-link-copy" data-hidden={isCollapsed}>
                          <span className="nav-link-title">{item.label}</span>
                          <span className="nav-link-description">{item.description}</span>
                        </span>
                        <ChevronRight size={16} className="nav-link-chevron" data-hidden={isCollapsed} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="nav-section" data-collapsed={isCollapsed}>
            <div className="section-label nav-section-label">Workspace</div>
            <Link
              href="/dashboard/profile"
              className="sidebar-utility-card sidebar-profile-link"
              title={isCollapsed ? 'Profile settings' : undefined}
            >
              <div className="inline section-label">
                <UserCircle2 size={16} />
                <span data-hidden={isCollapsed}>Profile</span>
              </div>
              {!isCollapsed ? (
                <div className="sidebar-copy" style={{ marginTop: 8 }}>
                  Edit your name, photo, bio, and theme preferences.
                </div>
              ) : null}
            </Link>

            <div className="sidebar-utility-card" title={isCollapsed ? 'Theme switcher' : undefined}>
              <div className="inline section-label">
                <Palette size={16} />
                <span data-hidden={isCollapsed}>View Mode</span>
              </div>
              {!isCollapsed ? <ThemeSwitcher currentTheme={themeMode} /> : null}
            </div>
          </div>
        </div>

        <div className="sidebar-bottom-section" data-collapsed={isCollapsed}>
          <div className="sidebar-utility-card">
            {viewer ? (
              <form action="/api/auth/signout" method="post">
                <button className="button button-secondary sidebar-signout" type="submit" title={isCollapsed ? 'Sign out' : undefined}>
                  {isCollapsed ? 'Out' : 'Sign out'}
                </button>
              </form>
            ) : (
              <Link className="button sidebar-signout" href="/login" title={isCollapsed ? 'Log in' : undefined}>
                {isCollapsed ? 'In' : 'Log in'}
              </Link>
            )}
          </div>
        </div>

        {!isMobileViewport && !isCollapsed ? (
          <button
            type="button"
            className="sidebar-edge-resize-handle"
            aria-label={`Resize sidebar, current width ${desktopWidth}px`}
            onPointerDown={(event) => {
              event.preventDefault();
              onDesktopResizeStart(event.clientX);
            }}
          />
        ) : null}
      </aside>
    </>
  );
}

