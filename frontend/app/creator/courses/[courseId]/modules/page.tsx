import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/AppShell';
import { CreatorCourseModulesWorkspace } from '@/components/course-builder/CreatorCourseModulesWorkspace';
import { requireServerCreatorPageContext } from '@/src/presentation/serverPage';

export default async function CreatorCourseModulesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { viewer, themeMode, container } = await requireServerCreatorPageContext(`/creator/courses/${courseId}/modules`);
  const { courseBuilderService } = container;

  try {
    const course = await courseBuilderService.getCreatorCourseDetail(viewer, courseId);

    return (
      <AppShell
        headerVariant="hero"
        viewer={viewer}
        themeMode={themeMode}
        eyebrow="Creator Studio"
        title="Modules Workspace"
        subtitle="A calmer module builder: left rail for structure, one active module at a time, no inline preview crowding, and dedicated node pages for authoring + preview. Open Course Account for dedicated pricing, certificate, and collaborator pages."
        actions={
          <div className="hero-actions-inline">
            {course.ownershipType !== 'collaborator' ? (
              <Link href={`/creator/courses/${course.id}/account`} className="button button-secondary">
                Course account
              </Link>
            ) : null}
            <Link href={`/creator/courses/${course.id}/edit`} className="button button-ghost">
              Edit metadata
            </Link>
          </div>
        }
      >
        <CreatorCourseModulesWorkspace initialCourse={course} />
      </AppShell>
    );
  } catch {
    notFound();
  }
}

