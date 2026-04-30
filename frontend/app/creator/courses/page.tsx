import Link from 'next/link';
import { BookOpen, Layers3, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { CreatorCourseCard } from '@/components/course-builder/CreatorCourseCard';
import { IncomingCollaborationRequestsPanel } from '@/components/creator/IncomingCollaborationRequestsPanel';
import { StatCard } from '@/components/ui/StatCard';
import { requireServerCreatorPageContext } from '@/src/presentation/serverPage';

export default async function CreatorCoursesPage() {
  const { viewer, themeMode, container } = await requireServerCreatorPageContext('/creator/courses');
  const { courseBuilderService, courseCollaborationService } = container;

  const [courses, invites] = await Promise.all([
    courseBuilderService.listCreatorCourses(viewer),
    courseCollaborationService.listIncomingInvites(viewer),
  ]);
  const totalPublished = courses.filter((course) => course.status === 'published').length;
  const totalModules = courses.reduce((sum, course) => sum + course.moduleCount, 0);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Creator Studio"
      title="My Courses"
      subtitle="Premium creator index for course covers, pricing, status, and quick access to the dedicated modules authoring flow."
      actions={
        <Link href="/creator/courses/new" className="button">
          <Sparkles size={16} />
          Create course
        </Link>
      }
    >
      <section className="stat-grid">
        <StatCard label="Courses" value={String(courses.length)} icon={<BookOpen size={18} />} />
        <StatCard label="Published" value={String(totalPublished)} />
        <StatCard label="Drafts" value={String(courses.length - totalPublished)} />
        <StatCard label="Modules" value={String(totalModules)} icon={<Layers3 size={18} />} />
      </section>

      <IncomingCollaborationRequestsPanel invites={invites} />
      {courses.length === 0 ? (
        <section className="studio-empty-state">
          <BrandSymbol size="lg" />
          <div className="stack" style={{ gap: 10 }}>
            <h2 className="panel-title">No courses yet</h2>
            <p className="muted" style={{ margin: 0 }}>
              Start with a polished course shell, then move into the route-based modules and node authoring workflow.
            </p>
          </div>
          <Link href="/creator/courses/new" className="button">
            Create your first course
          </Link>
        </section>
      ) : (
        <section className="studio-card-grid">
          {courses.map((course) => (
            <CreatorCourseCard key={course.id} course={course} />
          ))}
        </section>
      )}
    </AppShell>
  );
}

