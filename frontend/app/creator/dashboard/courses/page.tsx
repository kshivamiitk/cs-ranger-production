import Link from 'next/link';

import { CreatorStudioShell } from '@/components/creator/CreatorStudioShell';
import { IncomingCollaborationRequestsPanel } from '@/components/creator/IncomingCollaborationRequestsPanel';
import { CreatorCoursesOverview } from '@/components/creator/creator-dashboard-blocks';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorCoursesDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { courseBuilderService, courseCollaborationService }] = await Promise.all([
    requireServerCreator('/creator/dashboard/courses'),
    createServerContainer(),
  ]);
  const [courses, invites] = await Promise.all([
    courseBuilderService.listCreatorCourses(viewer),
    courseCollaborationService.listIncomingInvites(viewer),
  ]);
  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedCourses = paginateList(courses, pagination.page, pagination.size);

  return (
    <CreatorStudioShell
      viewer={viewer}
      themeMode={themeMode}
      title="Courses"
      subtitle="Authoring surface for every course you own, without finance widgets on the same canvas."
      actions={
        <Link href="/creator/courses/new" className="button">
          Create course
        </Link>
      }
    >
      <IncomingCollaborationRequestsPanel invites={invites} />
      <ListPaginationControls
        pathname="/creator/dashboard/courses"
        searchParams={resolvedSearchParams}
        page={pagedCourses.page}
        size={pagedCourses.size}
        totalItems={pagedCourses.totalItems}
        totalPages={pagedCourses.totalPages}
        startIndex={pagedCourses.startIndex}
        endIndex={pagedCourses.endIndex}
        noun="courses"
      />
      <CreatorCoursesOverview courses={pagedCourses.items} />
    </CreatorStudioShell>
  );
}


