import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Layers3, PencilLine } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { CourseAccountSectionNav } from '@/components/course-account/CourseAccountSectionNav';
import { CourseCertificateSettingsManager } from '@/components/course-account/CourseCertificateSettingsManager';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorCourseAccountCertificatesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [{ viewer, themeMode }, { courseBuilderService }] = await Promise.all([
    requireServerCreator(`/creator/courses/${courseId}/account/certificates`),
    createServerContainer(),
  ]);

  try {
    const course = await courseBuilderService.getOwnedCreatorCourseDetail(viewer, courseId);

    return (
      <AppShell
        viewer={viewer}
        themeMode={themeMode}
        eyebrow="Creator Studio"
        title="Certificate settings"
        subtitle="Dedicated certificate configuration for this course."
        headerVariant="hero"
      >
        <section className="stack-lg">
          <div className="panel stack course-account-hero">
            <div className="inline premium-badge-row">
              <span className="studio-badge studio-badge-primary">Certificate settings</span>
              <span className="studio-badge studio-badge-muted">{course.title}</span>
            </div>
            <div className="panel-header" style={{ alignItems: 'flex-start' }}>
              <div className="stack" style={{ gap: 10 }}>
                <h2 className="panel-title" style={{ margin: 0 }}>{course.title}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Keep certificate design and learner eligibility rules on their own page so the course account stays focused.
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
          <CourseAccountSectionNav courseId={course.id} active="certificates" />
          <CourseCertificateSettingsManager courseId={course.id} courseTitle={course.title} standalone />
        </section>
      </AppShell>
    );
  } catch {
    notFound();
  }
}


