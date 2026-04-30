import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeIndianRupee, FileBadge2, Handshake, Layers3, PencilLine } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { CourseAccountSectionNav } from '@/components/course-account/CourseAccountSectionNav';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorCourseAccountPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [{ viewer, themeMode }, { courseBuilderService }] = await Promise.all([
    requireServerCreator(`/creator/courses/${courseId}/account`),
    createServerContainer(),
  ]);

  try {
    const course = await courseBuilderService.getOwnedCreatorCourseDetail(viewer, courseId);

    return (
      <AppShell
        viewer={viewer}
        themeMode={themeMode}
        eyebrow="Creator Studio"
        title="Course Account"
        subtitle="A cleaner account hub: premium plans, certificate rules, and collaborators now live on dedicated pages."
        headerVariant="hero"
      >
        <section className="stack-lg">
          <div className="panel stack course-account-hero">
            <div className="inline premium-badge-row">
              <span className="studio-badge studio-badge-primary">Course account hub</span>
              <span className="studio-badge studio-badge-muted">{course.title}</span>
            </div>
            <div className="panel-header" style={{ alignItems: 'flex-start' }}>
              <div className="stack" style={{ gap: 10 }}>
                <h2 className="panel-title" style={{ margin: 0 }}>{course.title}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Open one focused page for pricing, one for certificate settings, and one for collaboration management.
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

          <CourseAccountSectionNav courseId={course.id} active="overview" />

          <section className="course-account-hub-grid">
            <Link href={`/creator/courses/${course.id}/account/pricing`} className="course-account-hub-card">
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">Course premium</span>
                <BadgeIndianRupee size={16} />
              </div>
              <h3 className="panel-title" style={{ margin: 0 }}>Pricing plans</h3>
              <p className="muted" style={{ margin: 0 }}>
                Add and archive premium plans, control duration options, and preview the plan selection learners will see during purchase.
              </p>
              <span className="button button-secondary">Open pricing page</span>
            </Link>

            <Link href={`/creator/courses/${course.id}/account/certificates`} className="course-account-hub-card">
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">Certificate settings</span>
                <FileBadge2 size={16} />
              </div>
              <h3 className="panel-title" style={{ margin: 0 }}>Certificate rules</h3>
              <p className="muted" style={{ margin: 0 }}>
                Configure certificate title, appearance, and learner eligibility rules without crowding the pricing workspace.
              </p>
              <span className="button button-secondary">Open certificate page</span>
            </Link>

            <Link href={`/creator/courses/${course.id}/account/collaborators`} className="course-account-hub-card">
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">Collaborators</span>
                <Handshake size={16} />
              </div>
              <h3 className="panel-title" style={{ margin: 0 }}>Collaboration settings</h3>
              <p className="muted" style={{ margin: 0 }}>
                Invite creators by username, review pending requests, manage active collaborators, and route request notifications cleanly.
              </p>
              <span className="button button-secondary">Open collaborator page</span>
            </Link>
          </section>
        </section>
      </AppShell>
    );
  } catch {
    notFound();
  }
}


