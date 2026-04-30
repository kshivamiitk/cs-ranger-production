import { AppShell } from '@/components/app-shell/AppShell';
import { AdminBulkPayoutConsole } from '@/components/admin/AdminBulkPayoutConsole';
import { describePayoutMode } from '@/lib/env';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerAdmin } from '@/src/presentation/serverPage';

export default async function AdminBulkPayoutsPage() {
  const [{ viewer, themeMode }, { adminFinanceService }] = await Promise.all([
    requireServerAdmin('/admin/bulk-payouts'),
    createServerContainer(),
  ]);
  const consoleData = await adminFinanceService.getBulkPayoutConsole(viewer);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin"
      title="Bulk payouts"
      subtitle={`${describePayoutMode()} Preview who is eligible, then dry-run or send one payout per creator through RazorpayX.`}
    >
      <AdminBulkPayoutConsole consoleData={consoleData} />
    </AppShell>
  );
}


