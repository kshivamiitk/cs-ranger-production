'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/creator/dashboard', label: 'Overview' },
  { href: '/creator/dashboard/finance', label: 'Finance' },
  { href: '/creator/courses', label: 'Courses' },
  { href: '/creator/dashboard/sales', label: 'Sales' },
  { href: '/creator/dashboard/certificates', label: 'Certificates' },
  { href: '/creator/learner-doubts', label: 'Doubts' },
] as const;

export function CreatorStudioNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="segmented-control creator-studio-nav" aria-label="Creator studio sections">
      {links.map((link) => {
        const active =
          link.href === '/creator/dashboard'
            ? pathname === '/creator/dashboard'
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className="segmented-control-button"
            data-active={active ? 'true' : 'false'}
            prefetch
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}


