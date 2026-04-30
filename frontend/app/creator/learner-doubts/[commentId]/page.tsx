import { notFound, redirect } from 'next/navigation';

import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorLearnerDoubtDetailPage({
  params,
}: {
  params: Promise<{ commentId: string }>;
}) {
  const { commentId } = await params;
  const [{ viewer, themeMode }, { creatorLearnerDoubtQueryService }] = await Promise.all([
    requireServerCreator(`/creator/learner-doubts/${commentId}`),
    createServerContainer(),
  ]);
  void themeMode;

  const detail = await creatorLearnerDoubtQueryService.getCreatorLearnerDoubtDetail(viewer, commentId).catch(() => null);
  if (!detail) {
    notFound();
  }

  redirect(`/courses/${detail.doubt.courseId}/nodes/${detail.doubt.nodeId}#discussion-comment-${detail.doubt.commentId}`);
}


