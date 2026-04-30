import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/AppShell';
import { NodeEditorLayout } from '@/components/course-builder/NodeEditorLayout';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function EditCourseNodePage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string; nodeId: string }>;
}) {
  const { courseId, moduleId, nodeId } = await params;

  const [{ viewer, themeMode }, { courseBuilderService }] = await Promise.all([
    requireServerCreator(`/creator/courses/${courseId}/modules/${moduleId}/nodes/${nodeId}/edit`),
    createServerContainer(),
  ]);

  try {
    const { course, module, node } = await courseBuilderService.getCreatorNodeDetail(viewer, {
      courseId,
      moduleId,
      nodeId,
    });
    const freeNodeCount = course.modules.reduce(
      (sum, entry) => sum + entry.nodes.filter((courseNode) => !courseNode.isPremium).length,
      0
    );

    return (
      <AppShell
        viewer={viewer}
        themeMode={themeMode}
        eyebrow="Creator Studio"
        title="Edit Node"
        subtitle="Route-based node editing keeps course structure, module management, and node authoring clearly separated, with full-width editors and previews directly below each tool."
      >
        <NodeEditorLayout
          mode="edit"
          course={{
            id: course.id,
            title: course.title,
            description: course.description,
            premiumEnabled: course.premiumEnabled,
            priceAmount: course.priceAmount,
            premiumAccessDays: course.premiumAccessDays,
            freeNodeCount,
          }}
          module={{ id: module.id, title: module.title, summary: module.summary }}
          node={node}
        />
      </AppShell>
    );
  } catch {
    notFound();
  }
}

