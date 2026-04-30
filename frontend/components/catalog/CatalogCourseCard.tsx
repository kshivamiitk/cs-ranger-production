import Link from 'next/link';
import { BookOpen, Lock, Sparkles, Star, Unlock, Users } from 'lucide-react';

import type { CatalogCourseSummary } from '@/src/domain/models';
import { CourseShareButton } from '@/components/course/CourseShareButton';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';
import { describeAccessExpiry } from '@/src/presentation/accessExpiry';
import { cn } from '@/lib/utils';

function ratingLabel(course: CatalogCourseSummary) {
  if (course.engagement.totalReviews <= 0) {
    return 'No ratings yet';
  }
  return `${course.engagement.averageRating.toFixed(1)} · ${course.engagement.totalReviews} ratings`;
}

function accessStateLabel(course: CatalogCourseSummary) {
  const premium = describeCoursePremiumState(course, course.premiumNodeCount);
  const isFree = premium.state === 'free';
  if (isFree) return 'Free course';
  if (course.access.viewerCanAccessPremium) {
    const expiry = describeAccessExpiry(course.access.activeEntitlement?.expiresAt ?? null);
    return expiry?.exactLabel ? `Access until ${expiry.exactLabel}` : 'Unlocked premium content';
  }
  return 'Locked · free nodes visible';
}

function shortStat(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

export function CatalogCourseCard(props: { course: CatalogCourseSummary }) {
  const { course } = props;
  const premium = describeCoursePremiumState(course, course.premiumNodeCount);
  const isFree = premium.state === 'free';
  const premiumAccessible = !isFree && course.access.viewerCanAccessPremium;
  const premiumLocked = !isFree && !course.access.viewerCanAccessPremium;
  const progressPercent = course.progress?.completionPercent ?? 0;
  const hasProgress = Boolean(course.progress?.continueLearning || progressPercent > 0);
  const continueHref = course.progress?.continueLearning
    ? `/courses/${course.id}/nodes/${course.progress.continueLearning.nodeId}`
    : `/courses/${course.id}`;
  const ctaLabel = course.progress?.continueLearning
    ? 'Continue'
    : premiumLocked
      ? 'Preview'
      : 'Open course';
  const heroBadge = isFree ? 'Free' : premiumAccessible ? 'Unlocked' : 'Premium locked';
  const accessLabel = accessStateLabel(course);
  const domainLabel = course.domainName ?? 'General learning';

  return (
    <article
      className={cn(
        'studio-card premium-course-card v13-course-card v226-course-card',
        isFree ? 'is-free' : undefined,
        premiumAccessible ? 'is-accessible' : undefined,
        premiumLocked ? 'is-locked' : undefined,
      )}
      data-premium-state={premium.state}
    >
      <div className="premium-course-media v13-course-media v226-course-media">
        {course.imageUrl ? (
          <img src={course.imageUrl} alt={course.title} className="premium-course-media-image v226-course-image" />
        ) : (
          <div className="premium-course-media-fallback v226-course-media-fallback" aria-hidden="true">
            <span>{course.title.slice(0, 1).toUpperCase() || 'C'}</span>
          </div>
        )}
        <div className="premium-course-media-gradient v226-course-media-gradient" aria-hidden="true" />
        <div className="premium-course-status-row v226-course-status-row">
          <div className="premium-course-status-stack">
            <span className={cn('premium-course-status premium-course-status-primary v226-course-state-chip', isFree ? 'is-free' : premiumLocked ? 'is-locked' : 'is-accessible')}>
              {heroBadge}
            </span>
          </div>
          <CourseShareButton courseId={course.id} courseTitle={course.title} />
        </div>
        <div className="v226-course-media-copy">
          <span className="v226-course-domain-chip">{domainLabel}</span>
          <h3>{course.title}</h3>
          <p>{course.creatorName ? `by ${course.creatorName}` : 'by Unknown creator'}</p>
        </div>
      </div>

      <div className="premium-course-card-body v13-course-card-body v226-course-card-body">
        <div className="v226-course-copy-stack">
          <div className="v13-course-byline v226-course-byline">
            <span>{domainLabel}</span>
            <span>{course.moduleCount} module{course.moduleCount === 1 ? '' : 's'}</span>
            <span>{course.nodeCount} node{course.nodeCount === 1 ? '' : 's'}</span>
          </div>
          <h3 className="premium-card-title v13-course-title v226-course-title">{course.title}</h3>
          <p className="premium-card-copy v13-course-description v226-course-description">{course.description}</p>

          <div className="v226-course-signal-row">
            <span className="v13-course-rating-line v226-course-signal">
              <Star size={15} />
              <span>{ratingLabel(course)}</span>
            </span>
            <span className="v226-course-signal">
              <Users size={15} />
              <span>{shortStat(course.engagement.activeLearnerCount)} learners</span>
            </span>
          </div>

          <div className="v13-course-access-line v226-course-access-line">
            {premiumAccessible ? <Unlock size={15} /> : premiumLocked ? <Lock size={15} /> : <Sparkles size={15} />}
            <span>{accessLabel}</span>
          </div>
        </div>

        {hasProgress ? (
          <div className="v226-course-progress-block" aria-label={`${progressPercent}% complete`}>
            <div className="v226-course-progress-copy">
              <span>{progressPercent}% complete</span>
              <span>{course.progress?.continueLearning?.nodeTitle ?? 'Next node ready'}</span>
            </div>
            <div className="v226-course-progress-track">
              <span className="v226-course-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
            </div>
          </div>
        ) : null}

        <div className="premium-course-card-footer v13-course-card-footer v226-course-card-footer">
          <span className="premium-course-plan v13-course-state-inline v226-course-state-inline">
            <BookOpen size={14} />
            {accessLabel}
          </span>
          <Link
            href={continueHref}
            className={cn('button premium-course-cta v226-course-cta', {
              'button-secondary': premiumLocked,
              'button-premium': premiumAccessible,
            })}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}


