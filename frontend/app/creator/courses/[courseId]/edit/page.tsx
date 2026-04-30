import { notFound } from 'next/navigation';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { EditCourseMetadataForm } from '@/components/course-builder/EditCourseMetadataForm';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { courseCountsAsFree } from '@/src/domain/creatorCoursePolicy';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function EditCreatorCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [{ viewer, themeMode }, { courseBuilderService }] = await Promise.all([
    requireServerCreator(`/creator/courses/${courseId}/edit`),
    createServerContainer(),
  ]);

  try {
    const [course, courses] = await Promise.all([
      courseBuilderService.getOwnedCreatorCourseDetail(viewer, courseId),
      courseBuilderService.listCreatorCourses(viewer),
    ]);
    const creatorFreeCourseCount = courses.filter(
      (entry) => entry.ownershipType !== 'collaborator' && courseCountsAsFree(entry)
    ).length;

    return (
      <AppShell
        viewer={viewer}
        themeMode={themeMode}
        eyebrow="Creator Studio"
        title="Edit Course"
        subtitle="Configure the course hero and publishing state here, then open Course Account to manage pricing plans, certificate settings, and collaborators."
      >
        <section className="stack-lg">
          <div className="inline">
            <Link href="/creator/courses" className="button button-ghost">
              Back to creator courses
            </Link>
          </div>
          <EditCourseMetadataForm course={course} creatorFreeCourseCount={creatorFreeCourseCount} />
        </section>
      </AppShell>
    );
  } catch {
    notFound();
  }
}

