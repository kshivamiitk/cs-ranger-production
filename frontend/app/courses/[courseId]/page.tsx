import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/AppShell';
import { LearnerCourseWorkspace } from '@/components/learner/LearnerCourseWorkspace';
import { CourseReviewsSection } from '@/components/reviews/CourseReviewsSection';
import { getServerPageContext } from '@/src/presentation/serverPage';

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ node?: string }>;
}) {
  const { courseId } = await params;
  const { node: requestedNodeId } = await searchParams;
  const { viewer, themeMode, container } = await getServerPageContext();
  const { catalogService, creatorPublicProfileService, courseReviewQueryService } = container;

  const workspaceView = await catalogService
    .getCourseWorkspaceView(viewer, courseId, requestedNodeId ?? null)
    .catch(() => notFound());
  const { course } = workspaceView;
  const [creatorStrip, reviewsView] = await Promise.all([
    creatorPublicProfileService
      .getCreatorProfileSummary(viewer, course.creatorUserId)
      .catch(() => null),
    courseReviewQueryService
      .getCourseReviewsViewForCourse(viewer, course, workspaceView.access.activeEntitlement)
      .catch(() => null),
  ]);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Course"
      title={course.title}
      subtitle={course.description.trim() || 'A premium course workspace with curriculum, access status, certificate progress, and creator context.'}
      hideHeader
    >
      <LearnerCourseWorkspace
        view={workspaceView}
        creatorStrip={
          creatorStrip
            ? {
                creator: creatorStrip.creator,
                follow: creatorStrip.follow,
                viewerUserId: viewer?.user.id ?? null,
              }
            : null
        }
      />
      {reviewsView ? (
        <CourseReviewsSection
          courseId={course.id}
          initialView={reviewsView}
        />
      ) : null}
    </AppShell>
  );
}
