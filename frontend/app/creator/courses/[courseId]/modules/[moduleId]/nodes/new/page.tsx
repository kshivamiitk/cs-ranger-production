import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/AppShell';
import { NodeEditorLayout } from '@/components/course-builder/NodeEditorLayout';
import { createServerContainer } from '@/src/infrastructure/container/server';
import type { NodeType } from '@/src/domain/models';
import { requireServerCreator } from '@/src/presentation/serverPage';

function resolveNodeType(value: string | string[] | undefined): NodeType | undefined {
  if (value === 'content' || value === 'question' || value === 'quiz' || value === 'video' || value === 'html' || value === 'pdf') {
    return value;
  }

  return undefined;
}

export default async function CreateCourseNodePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { courseId, moduleId } = await params;
  const query = await searchParams;
  const initialType = resolveNodeType(query.type);

  const [{ viewer, themeMode }, { courseBuilderService }] = await Promise.all([
    requireServerCreator(`/creator/courses/${courseId}/modules/${moduleId}/nodes/new`),
    createServerContainer(),
  ]);

  try {
    const { course, module } = await courseBuilderService.getCreatorModuleDetail(viewer, { courseId, moduleId });
    const freeNodeCount = course.modules.reduce(
      (sum, entry) => sum + entry.nodes.filter((node) => !node.isPremium).length,
      0
    );

    return (
      <AppShell
        viewer={viewer}
        themeMode={themeMode}
        eyebrow="Creator Studio"
        title="Create Node"
        subtitle="Focused authoring page for creating one node at a time, with scrollable previews placed beneath each editing surface."
      >
        <NodeEditorLayout
          mode="create"
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
          initialType={initialType}
        />
      </AppShell>
    );
  } catch {
    notFound();
  }
}
