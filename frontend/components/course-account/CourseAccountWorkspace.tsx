import Link from 'next/link';

import { CoursePricingPlansManager } from '@/components/course-account/CoursePricingPlansManager';
import { CourseCertificateSettingsManager } from '@/components/course-account/CourseCertificateSettingsManager';
import { CourseCollaboratorsManager } from '@/components/course-account/CourseCollaboratorsManager';

export function CourseAccountWorkspace(props: { courseId: string; courseTitle: string }) {
  return (
    <section className="stack-lg">
      <div className="panel stack course-account-hero">
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-primary">Course account</span>
          <span className="studio-badge studio-badge-muted">Mobile-ready account, access, and certificate controls</span>
        </div>
        <div className="panel-header" style={{ alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 10 }}>
            <h2 className="panel-title" style={{ margin: 0 }}>{props.courseTitle}</h2>
            <p className="muted" style={{ margin: 0 }}>
              This screen centralizes manual pricing schemes, certificate settings, and learner-facing access behavior so creators do not have to hunt through multiple pages.
            </p>
          </div>
          <div className="inline premium-badge-row">
            <Link href={`/creator/courses/${props.courseId}/modules`} className="button button-secondary">Manage modules</Link>
            <Link href={`/creator/courses/${props.courseId}/edit`} className="button button-ghost">Back to metadata</Link>
          </div>
        </div>
      </div>

      <CoursePricingPlansManager courseId={props.courseId} />
      <CourseCertificateSettingsManager courseId={props.courseId} courseTitle={props.courseTitle} />
      <CourseCollaboratorsManager courseId={props.courseId} courseTitle={props.courseTitle} />
    </section>
  );
}


