'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, Menu, MessageSquareText, Search, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ThemeMode, Viewer } from '@/src/domain/models';
import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { ThemeSwitcher } from '@/components/app-shell/ThemeSwitcher';
import { UserAvatar } from '@/components/user/UserAvatar';
import {
  buildPrimaryNavigation,
  buildSettingsNavigation,
  getInlineNavLimit,
  getUtilityRoutes,
  resolveAppShellMode,
} from '@/src/presentation/appNavigation';
import { cn } from '@/lib/utils';

function renderBadgeCount(count?: number) {
  if (!count || count <= 0) return null;
  if (count > 99) return '99+';
  if (count > 9) return '9+';
  return String(count);
}

export function TopNavbar(props: {
  viewer: Viewer | null;
  themeMode: ThemeMode;
  onMenuClick?: () => void;
  unreadCounts?: {
    feed?: number;
    support?: number;
    notifications?: number;
  };
}) {
  const pathname = usePathname() ?? '/';
  const navItems = buildPrimaryNavigation({ pathname, viewer: props.viewer });
  const inlineNavLimit = getInlineNavLimit(pathname);
  const inlineNavItems = navItems.slice(0, inlineNavLimit);
  const settingsSections = buildSettingsNavigation({ pathname, viewer: props.viewer });
  const utility = getUtilityRoutes({ pathname, viewer: props.viewer });
  const shellMode = resolveAppShellMode(pathname);
  const isLearnerShell = shellMode === 'learner';
  const label = shellMode === 'creator' ? 'Creator Studio' : shellMode === 'admin' ? 'Admin Console' : 'Learner Workspace';
  const homeHref = props.viewer
    ? shellMode === 'creator'
      ? '/creator/dashboard'
      : shellMode === 'admin'
        ? '/admin'
        : '/dashboard'
    : '/';

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSettingsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!settingsRef.current) return;
      if (!settingsRef.current.contains(event.target as Node)) setSettingsOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSettingsOpen(false);
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const hasSettingsMenu = settingsSections.some((section) => section.items.length > 0);
  const profileName = useMemo(() => {
    const fullName = props.viewer?.profile.fullName ?? props.viewer?.user.fullName ?? 'Guest';
    return fullName.trim() || 'Guest';
  }, [props.viewer]);
  const profileLabel = useMemo(() => profileName.split(' ')[0] ?? 'Guest', [profileName]);
  const feedBadge = renderBadgeCount(props.unreadCounts?.feed);
  const supportBadge = renderBadgeCount(props.unreadCounts?.support);
  const notificationBadge = renderBadgeCount(props.unreadCounts?.notifications);

  return (
    <>
      <header className="top-navbar-shell top-navbar-shell-v226" data-shell-mode={shellMode}>
        <div className="top-navbar-row top-navbar-row-v8 top-navbar-row-v226">
          <div className="top-navbar-left">
            {props.onMenuClick ? (
              <button type="button" className="top-navbar-menu" onClick={props.onMenuClick} aria-label="Open navigation drawer">
                <Menu size={18} />
              </button>
            ) : null}
            <Link href={homeHref} className="top-navbar-brand">
              <BrandSymbol className="top-navbar-brand-mark" size="sm" />
              <div className="top-navbar-brand-copy">
                <strong>CS Ranger</strong>
                <span>{label}</span>
              </div>
              <span className="top-navbar-mode-chip">1.0</span>
            </Link>
          </div>

          <nav className="top-navbar-nav" aria-label="Primary">
            {inlineNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const isFeed = item.href === '/dashboard/feed';
              return (
                <Link key={item.href} href={item.href} className={cn('top-navbar-link', active && 'is-active')}>
                  <span>{item.label}</span>
                  {isFeed && feedBadge ? <span className="top-navbar-link-pill">{feedBadge}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="top-navbar-right">
            <Link href={utility.searchHref} className="top-navbar-search-button" aria-label="Open search workspace">
              <Search size={16} />
              <span>Search</span>
              <kbd className="top-navbar-search-kbd">⌘K</kbd>
            </Link>

            {hasSettingsMenu ? (
              <div className="top-navbar-settings" ref={settingsRef}>
                <button
                  type="button"
                  className={cn('top-navbar-settings-button', settingsOpen && 'is-open')}
                  aria-haspopup="menu"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((current) => !current)}
                >
                  <Settings2 size={17} />
                  <span>Settings</span>
                  <ChevronDown size={14} className="top-navbar-settings-chevron" />
                </button>

                {settingsOpen ? (
                  <div className="top-navbar-settings-panel" role="menu" aria-label="Workspace settings and shortcuts">
                    {settingsSections.map((section) => (
                      <div key={section.title} className="top-navbar-settings-section">
                        <div className="top-navbar-settings-title">{section.title}</div>
                        <div className="top-navbar-settings-links">
                          {section.items.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                              <Link key={item.href} href={item.href} className={cn('top-navbar-settings-link', active && 'is-active')} role="menuitem">
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <Link href={utility.messagesHref} className="top-navbar-icon-link top-navbar-icon-link-badge" aria-label="Open support inbox">
              <MessageSquareText size={17} />
              {supportBadge ? <span className="top-navbar-icon-badge">{supportBadge}</span> : null}
            </Link>
            {!isLearnerShell ? (
              <Link href={utility.notificationsHref} className="top-navbar-icon-link top-navbar-icon-link-badge" aria-label="Open notifications">
                <Bell size={17} />
                {notificationBadge ? <span className="top-navbar-icon-badge">{notificationBadge}</span> : null}
              </Link>
            ) : null}
            <ThemeSwitcher currentTheme={props.themeMode} compact />
            <Link href={utility.profileHref} className="top-navbar-profile-link" aria-label="Open profile settings">
              <UserAvatar src={props.viewer?.profile.profilePhotoUrl} name={profileName} alt={profileName} size="sm" className="top-navbar-profile-avatar" />
              <span>{profileLabel}</span>
            </Link>
            {props.viewer ? (
              <form action="/api/auth/signout" method="post">
                <button type="submit" className="button button-ghost top-navbar-auth-button">Sign out</button>
              </form>
            ) : (
              <Link href="/login" className="button button-secondary top-navbar-auth-button">Log in</Link>
            )}
          </div>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
        {inlineNavItems.slice(0, 4).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isFeed = item.href === '/dashboard/feed';
          return (
            <Link key={item.href} href={item.href} className={cn('mobile-bottom-nav-link', active && 'is-active')}>
              <span>{item.shortLabel ?? item.label}</span>
              {isFeed && feedBadge ? <span className="mobile-bottom-nav-badge">{feedBadge}</span> : null}
            </Link>
          );
        })}
        <button type="button" className="mobile-bottom-nav-link" onClick={() => setSettingsOpen((current) => !current)}>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

