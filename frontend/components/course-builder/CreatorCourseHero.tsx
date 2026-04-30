'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Layers3, LayoutTemplate, PencilLine } from 'lucide-react';

import { CourseImagePreview } from '@/components/course-builder/CourseImagePreview';
import type { CourseDetail } from '@/src/domain/models';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';

export function CreatorCourseHero(props: {
  course: Pick<
    CourseDetail,
    | 'id'
    | 'title'
    | 'description'
    | 'imageUrl'
    | 'status'
    | 'priceAmount'
    | 'premiumEnabled'
    | 'premiumAccessDays'
    | 'modules'
  >;
  backHref: string;
  backLabel: string;
  actions?: ReactNode;
}) {
  const totalNodes = props.course.modules.reduce((sum, module) => sum + module.nodes.length, 0);
  const premiumNodeCount = props.course.modules.reduce(
    (sum, module) => sum + module.nodes.filter((node) => node.isPremium).length,
    0
  );
  const premium = describeCoursePremiumState(props.course, premiumNodeCount);
  const premiumToneClass =
    premium.tone === 'primary'
      ? 'studio-badge-primary'
      : premium.tone === 'warning'
        ? 'studio-badge-warning'
        : 'studio-badge-success';

  return (
    <section className="studio-hero-card">
      <div className="studio-hero-grid">
        <div className="stack-lg" style={{ gap: 18 }}>
          <Link href={props.backHref} className="inline muted-link">
            <ArrowLeft size={16} />
            {props.backLabel}
          </Link>

          <div className="inline premium-badge-row">
            <span className={`studio-badge ${props.course.status === 'published' ? 'studio-badge-success' : 'studio-badge-muted'}`}>
              {props.course.status}
            </span>
            <span className={`studio-badge ${premiumToneClass}`}>
              {premium.label}
            </span>
            <span className="studio-badge studio-badge-muted">
              <Layers3 size={14} />
              {props.course.modules.length} module{props.course.modules.length === 1 ? '' : 's'}
            </span>
            <span className="studio-badge studio-badge-muted">
              <LayoutTemplate size={14} />
              {totalNodes} node{totalNodes === 1 ? '' : 's'}
            </span>
            <span className="studio-badge studio-badge-muted">
              {premiumNodeCount} premium node{premiumNodeCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="stack" style={{ gap: 12 }}>
            <div className="section-label">Creator Modules</div>
            <h2 className="headline" style={{ fontSize: 'clamp(2.1rem, 3vw, 3.25rem)' }}>{props.course.title}</h2>
            <p className="subheadline" style={{ marginTop: 0, maxWidth: 720 }}>
              {props.course.description}
            </p>
            <p className="muted" style={{ margin: 0, maxWidth: 720 }}>
              {premium.helper}
            </p>
          </div>

          <div className="hero-actions" style={{ justifyContent: 'flex-start' }}>
            {props.actions}
            <Link href={`/creator/courses/${props.course.id}/edit`} className="button button-secondary">
              <PencilLine size={16} />
              {premium.state === 'free' ? 'Create pricing' : 'Edit pricing'}
            </Link>
          </div>
        </div>

        <CourseImagePreview
          title={props.course.title}
          description={props.course.description}
          imageUrl={props.course.imageUrl}
          badge={props.course.status === 'published' ? 'Published' : 'Draft'}
          className="studio-hero-visual"
        />
      </div>
    </section>
  );
}


