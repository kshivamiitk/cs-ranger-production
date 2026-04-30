import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Layers3, PencilLine } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { CourseAccountSectionNav } from '@/components/course-account/CourseAccountSectionNav';
import { CoursePricingPlansManager } from '@/components/course-account/CoursePricingPlansManager';
import { requireServerCreatorPageContext } from '@/src/presentation/serverPage';

export default async function CreatorCourseAccountPricingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { viewer, themeMode, container } = await requireServerCreatorPageContext(`/creator/courses/${courseId}/account/pricing`);
  const { courseBuilderService } = container;

  try {
    const course = await courseBuilderService.getOwnedCreatorCourseDetail(viewer, courseId);

    return (
      <AppShell
        viewer={viewer}
        themeMode={themeMode}
        eyebrow="Creator Studio"
        title="Course premium"
        subtitle="Dedicated premium plan management for this course."
        headerVariant="hero"
      >
        <section className="stack-lg">
          <div className="panel stack course-account-hero">
            <div className="inline premium-badge-row">
              <span className="studio-badge studio-badge-primary">Course premium</span>
              <span className="studio-badge studio-badge-muted">{course.title}</span>
            </div>
            <div className="panel-header" style={{ alignItems: 'flex-start' }}>
              <div className="stack" style={{ gap: 10 }}>
                <h2 className="panel-title" style={{ margin: 0 }}>{course.title}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Manage learner-facing premium plans here instead of mixing them with certificate and collaborator controls.
                </p>
              </div>
              <div className="inline premium-badge-row">
                <Link href={`/creator/courses/${course.id}/edit`} className="button button-secondary">
                  <PencilLine size={16} />
                  Edit metadata
                </Link>
                <Link href={`/creator/courses/${course.id}/modules`} className="button button-ghost">
                  <Layers3 size={16} />
                  Manage modules
                </Link>
              </div>
            </div>
          </div>
          <CourseAccountSectionNav courseId={course.id} active="pricing" />
          <CoursePricingPlansManager courseId={course.id} standalone />
        </section>
      </AppShell>
    );
  } catch {
    notFound();
  }
}

