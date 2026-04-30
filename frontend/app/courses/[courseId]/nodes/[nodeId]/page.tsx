import { notFound } from 'next/navigation';

import { ReaderShell } from '@/components/app-shell/ReaderShell';
import { CourseExplorerSidebar } from '@/components/course/CourseExplorerSidebar';
import { NodeDiscussionSection } from '@/components/discussions/NodeDiscussionSection';
import { StandaloneLearnerNodePage } from '@/components/learner/StandaloneLearnerNodePage';
import { getContentSectionBySlug } from '@/src/domain/contentSections';
import type { CatalogCourseNodeView } from '@/src/domain/models';
import { getServerPageContext } from '@/src/presentation/serverPage';

export default async function CourseNodeReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; nodeId: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const [{ courseId, nodeId }, { section }, { viewer, container }] = await Promise.all([
    params,
    searchParams,
    getServerPageContext(),
  ]);
  const { catalogService, nodeDiscussionQueryService, nodeBookmarkQueryService } = container;
  const selectedContentSection = getContentSectionBySlug(section).key;

  const workspaceView = await catalogService
    .getCourseWorkspaceView(viewer, courseId, nodeId)
    .catch(() => notFound());

  if (workspaceView.activeNodeSummary?.id !== nodeId) {
    notFound();
  }

  const courseView = {
    course: {
      id: workspaceView.course.id,
      title: workspaceView.course.title,
      description: workspaceView.course.description,
      imageUrl: workspaceView.course.imageUrl,
      priceAmount: workspaceView.course.priceAmount,
      premiumEnabled: workspaceView.course.premiumEnabled,
      premiumAccessDays: workspaceView.course.premiumAccessDays,
    },
    overview: workspaceView.overview,
    access: workspaceView.access,
    progress: workspaceView.progress,
    module: workspaceView.activeModule,
    nodeSummary: workspaceView.activeNodeSummary,
    node: workspaceView.activeNode,
    nodeLocked: Boolean(workspaceView.activeNodeSummary?.isLocked),
    nodeCompleted: Boolean(workspaceView.activeNodeSummary?.isCompleted),
    previousNode: workspaceView.previousNode,
    nextNode: workspaceView.nextNode,
  } satisfies CatalogCourseNodeView;
  const [discussionView, bookmarkState] =
    courseView.node && !courseView.nodeLocked
      ? await Promise.all([
          nodeDiscussionQueryService.getNodeDiscussionView(viewer, nodeId).catch(() => null),
          nodeBookmarkQueryService.getNodeBookmarkState(viewer, { nodeId }).catch(() => ({
            nodeId,
            isBookmarked: false,
            canBookmark: Boolean(viewer && !viewer.profile.isBanned),
          })),
        ])
      : [
          null,
          {
            nodeId,
            isBookmarked: false,
            canBookmark: false,
          },
        ];
  const subtitle = courseView.module
    ? `${courseView.module.title} · ${courseView.course.title}`
    : `${courseView.course.title} · Standalone node reader`;

  return (
    <ReaderShell
      eyebrow="CS Ranger"
      title={courseView.node?.title ?? 'Content locked'}
      subtitle={subtitle}
      showHero={false}
      hideTopbar
      sidebar={(
        <CourseExplorerSidebar
          courseId={courseId}
          courseTitle={workspaceView.course.title}
          modules={workspaceView.course.modules}
          activeModuleId={courseView.module?.id ?? null}
          activeNodeId={nodeId}
        />
      )}
    >
      <StandaloneLearnerNodePage
        courseView={courseView}
        interactiveQuiz={Boolean(viewer)}
        contentSectionKey={courseView.node?.type === 'content' ? selectedContentSection : null}
        initialBookmarked={bookmarkState.isBookmarked}
        bookmarkEnabled={bookmarkState.canBookmark}
      />
      {discussionView ? (
        <NodeDiscussionSection
          nodeId={nodeId}
          initialView={discussionView}
        />
      ) : null}
    </ReaderShell>
  );
}
