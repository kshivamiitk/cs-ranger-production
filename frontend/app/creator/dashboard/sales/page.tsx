import Link from 'next/link';

import { CreatorStudioShell } from '@/components/creator/CreatorStudioShell';
import { CreatorSalesOverview } from '@/components/creator/creator-dashboard-blocks';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorSalesDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { creatorFinanceService }] = await Promise.all([
    requireServerCreator('/creator/dashboard/sales'),
    createServerContainer(),
  ]);
  const { sales } = await creatorFinanceService.getCreatorDashboard(viewer);
  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedSales = paginateList(sales, pagination.page, pagination.size);

  return (
    <CreatorStudioShell
      viewer={viewer}
      themeMode={themeMode}
      title="Premium sales"
      subtitle="Ledger of premium purchases that hit your creator wallet."
      actions={
        <Link href="/creator/courses" className="button button-secondary">
          Course list
        </Link>
      }
    >
      <ListPaginationControls
        pathname="/creator/dashboard/sales"
        searchParams={resolvedSearchParams}
        page={pagedSales.page}
        size={pagedSales.size}
        totalItems={pagedSales.totalItems}
        totalPages={pagedSales.totalPages}
        startIndex={pagedSales.startIndex}
        endIndex={pagedSales.endIndex}
        noun="sales"
      />
      <CreatorSalesOverview sales={pagedSales.items} />
    </CreatorStudioShell>
  );
}


