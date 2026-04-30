import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Handshake, Layers3, PencilLine } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { CourseAccountSectionNav } from '@/components/course-account/CourseAccountSectionNav';
import { CourseCollaboratorsManager } from '@/components/course-account/CourseCollaboratorsManager';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorCourseAccountCollaboratorsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [{ viewer, themeMode }, { courseBuilderService, courseCollaborationService }] = await Promise.all([
    requireServerCreator(`/creator/courses/${courseId}/account/collaborators`),
    createServerContainer(),
  ]);

  try {
    const [course, access] = await Promise.all([
      courseBuilderService.getCreatorCourseDetail(viewer, courseId),
      courseCollaborationService.getCourseAccess(viewer, courseId),
    ]);

    return (
      <AppShell
        viewer={viewer}
        themeMode={themeMode}
        eyebrow="Creator Studio"
        title="Collaborators"
        subtitle="Dedicated collaborator requests, active editors, and collaboration notifications for this course."
        headerVariant="hero"
      >
        <section className="stack-lg">
          <div className="panel stack course-account-hero">
            <div className="inline premium-badge-row">
              <span className="studio-badge studio-badge-primary">Collaborators</span>
              <span className="studio-badge studio-badge-muted">{course.title}</span>
              {!access.canManageCollaborators ? <span className="studio-badge studio-badge-warning">Collaborator view</span> : null}
            </div>
            <div className="panel-header" style={{ alignItems: 'flex-start' }}>
              <div className="stack" style={{ gap: 10 }}>
                <h2 className="panel-title" style={{ margin: 0 }}>{course.title}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Search creators by username, send collaborator requests, and keep course editing access separate from pricing and certificates.
                </p>
              </div>
              <div className="inline premium-badge-row">
                {access.canManageCollaborators ? (
                  <Link href={`/creator/courses/${course.id}/edit`} className="button button-secondary">
                    <PencilLine size={16} />
                    Edit metadata
                  </Link>
                ) : null}
                <Link href={`/creator/courses/${course.id}/modules`} className="button button-ghost">
                  <Layers3 size={16} />
                  Manage modules
                </Link>
                <Link href="/creator/dashboard/notifications" className="button button-ghost">
                  <Handshake size={16} />
                  Open notifications
                </Link>
              </div>
            </div>
          </div>
          <CourseAccountSectionNav courseId={course.id} active="collaborators" />
          <CourseCollaboratorsManager courseId={course.id} courseTitle={course.title} standalone />
        </section>
      </AppShell>
    );
  } catch {
    notFound();
  }
}


