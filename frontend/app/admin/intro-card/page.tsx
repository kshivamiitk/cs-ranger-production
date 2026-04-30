import { unstable_noStore as noStore } from 'next/cache';

import { AppShell } from '@/components/app-shell/AppShell';
import { AdminIntroCardForm } from '@/components/admin/AdminIntroCardForm';
import { requireServerAdmin } from '@/src/presentation/serverPage';
import { getActiveAdminIntroCard } from '@/src/server/adminIntro';

export default async function AdminIntroCardPage() {
  noStore();
  const { viewer, themeMode } = await requireServerAdmin('/admin/intro-card');
  const card = await getActiveAdminIntroCard().catch(() => null);

  return (
    <AppShell viewer={viewer} themeMode={themeMode} eyebrow="Admin" title="Admin intro card" subtitle="Manage the featured public card shown on login/signup pages.">
      <AdminIntroCardForm initialValues={card ? { title: card.title, body: card.body, imageUrl: card.imageUrl ?? '', imageFocus: card.imageFocus, ctaLabel: card.ctaLabel ?? '', ctaHref: card.ctaHref ?? '', isActive: card.isActive } : undefined} />
    </AppShell>
  );
}


