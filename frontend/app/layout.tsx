import 'katex/dist/katex.min.css';
import '@/app/globals.css';

import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';

import { cookieNames, defaultTheme } from '@/lib/constants';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: 'CS Ranger',
    template: '%s · CS Ranger',
  },
  description: 'Scale-ready creator and learner platform with fast course APIs, modern course nodes, immersive previews, and production testing hooks.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/image.jpg', type: 'image/jpeg' },
    ],
    apple: [{ url: '/favicon.ico' }],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    title: 'CS Ranger',
    description: 'Scale-ready creator and learner platform with fast course APIs, modern course nodes, immersive previews, and production testing hooks.',
    images: ['/image.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#060b14',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(cookieNames.theme)?.value;
  const themeMode =
    theme === 'light' || theme === 'dark' || theme === 'ocean' || theme === 'forest' || theme === 'ember' ? theme : defaultTheme;

  return (
    <html lang="en" data-theme={themeMode}>
      <body>{children}</body>
    </html>
  );
}
