import Link from 'next/link';
import { ArrowRight, Clock3, Layers, PencilLine } from 'lucide-react';

import { CourseShareButton } from '@/components/course/CourseShareButton';
import { CourseImagePreview } from '@/components/course-builder/CourseImagePreview';
import { formatDateLabel } from '@/lib/utils';
import type { CourseOverview } from '@/src/domain/models';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';

export function CreatorCourseCard(props: {
  course: CourseOverview;
}) {
  const statusLabel = props.course.status === 'published' ? 'Published' : 'Draft';
  const premium = describeCoursePremiumState(props.course, props.course.premiumNodeCount);
  const premiumToneClass =
    premium.tone === 'primary'
      ? 'studio-badge-primary'
      : premium.tone === 'warning'
        ? 'studio-badge-warning'
        : 'studio-badge-success';

  return (
    <article className="studio-card premium-course-card v226-creator-course-card">
      <div className="premium-course-media premium-course-media--creator v226-creator-course-media">
        <CourseImagePreview
          title={props.course.title}
          description={props.course.description}
          imageUrl={props.course.imageUrl}
          compact
          badge={statusLabel}
        />
        <div className="premium-course-status-row premium-course-status-row-actions-only">
          <CourseShareButton courseId={props.course.id} courseTitle={props.course.title} />
        </div>
      </div>

      <div className="premium-course-card-body v226-creator-course-body">
        <div className="inline premium-badge-row">
          <span className={`studio-badge ${props.course.status === 'published' ? 'studio-badge-success' : 'studio-badge-muted'}`}>
            {statusLabel}
          </span>
          <span className={`studio-badge ${props.course.ownershipType === 'collaborator' ? 'studio-badge-warning' : 'studio-badge-primary'}`}>
            {props.course.ownershipType === 'collaborator' ? 'Collaborating' : 'Owned'}
          </span>
          <span className={`studio-badge ${premiumToneClass}`}>
            {premium.label}
          </span>
          <span className="studio-badge studio-badge-muted">
            {props.course.moduleCount} module{props.course.moduleCount === 1 ? '' : 's'}
          </span>
          <span className="studio-badge studio-badge-muted">
            {props.course.nodeCount} node{props.course.nodeCount === 1 ? '' : 's'}
          </span>
          <span className="studio-badge studio-badge-muted">
            {props.course.premiumNodeCount} premium node{props.course.premiumNodeCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <h2 className="premium-card-title">{props.course.title}</h2>
          <p className="premium-card-copy">{props.course.description}</p>
          <p className="muted" style={{ margin: 0 }}>
            {premium.helper}
          </p>
        </div>

        <div className="premium-course-card-footer">
          <div className="premium-course-meta">
            <span>
              <Layers size={14} />
              {props.course.moduleCount} modules
            </span>
            <span>
              <Clock3 size={14} />
              Updated {formatDateLabel(props.course.updatedAt)}
            </span>
          </div>

          <div className="inline">
            {props.course.ownershipType !== 'collaborator' ? (
              <>
                <Link href={`/creator/courses/${props.course.id}/account`} className="button button-ghost">
                  Account
                </Link>
                <Link href={`/creator/courses/${props.course.id}/edit`} className="button button-secondary">
                  <PencilLine size={16} />
                  Edit course
                </Link>
              </>
            ) : null}
            <Link href={`/creator/courses/${props.course.id}/modules`} className="button">
              Open modules
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}


