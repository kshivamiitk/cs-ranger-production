import { AppShell } from '@/components/app-shell/AppShell';
import { NewCourseForm } from '@/components/course-builder/NewCourseForm';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { courseCountsAsFree } from '@/src/domain/creatorCoursePolicy';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function NewCreatorCoursePage() {
  const [{ viewer, themeMode }, { courseBuilderService }] = await Promise.all([
    requireServerCreator('/creator/courses/new'),
    createServerContainer(),
  ]);
  const courses = await courseBuilderService.listCreatorCourses(viewer);
  const creatorFreeCourseCount = courses.filter(
    (course) => course.ownershipType !== 'collaborator' && courseCountsAsFree(course)
  ).length;

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Creator Studio"
      title="Create Course"
      subtitle="Start with a premium course shell: title, summary, cover image, price, and status. Module authoring begins after the course exists."
    >
      <NewCourseForm creatorFreeCourseCount={creatorFreeCourseCount} />
    </AppShell>
  );
}

