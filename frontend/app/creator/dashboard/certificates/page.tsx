import Link from 'next/link';

import { CreatorStudioShell } from '@/components/creator/CreatorStudioShell';
import { CreatorCertificatesOverview } from '@/components/creator/creator-dashboard-blocks';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorCertificatesDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { certificateService }] = await Promise.all([
    requireServerCreator('/creator/dashboard/certificates'),
    createServerContainer(),
  ]);
  const certificates = await certificateService.getCreatorOverview(viewer);
  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedCertificates = paginateList(certificates, pagination.page, pagination.size);

  return (
    <CreatorStudioShell
      viewer={viewer}
      themeMode={themeMode}
      title="Certificates"
      subtitle="Per-course certificate templates and issuance counts."
      actions={
        <Link href="/creator/courses" className="button button-secondary">
          Back to courses
        </Link>
      }
    >
      <ListPaginationControls
        pathname="/creator/dashboard/certificates"
        searchParams={resolvedSearchParams}
        page={pagedCertificates.page}
        size={pagedCertificates.size}
        totalItems={pagedCertificates.totalItems}
        totalPages={pagedCertificates.totalPages}
        startIndex={pagedCertificates.startIndex}
        endIndex={pagedCertificates.endIndex}
        noun="certificate rows"
      />
      <CreatorCertificatesOverview certificates={pagedCertificates.items} />
    </CreatorStudioShell>
  );
}


