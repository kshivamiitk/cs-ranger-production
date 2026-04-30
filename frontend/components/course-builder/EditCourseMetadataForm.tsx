'use client';

import type { CourseDetail } from '@/src/domain/models';
import { courseCountsAsFree } from '@/src/domain/creatorCoursePolicy';
import { CourseMetadataForm } from '@/components/course-builder/CourseMetadataForm';

export function EditCourseMetadataForm(props: {
  course: Pick<
    CourseDetail,
    | 'id'
    | 'title'
    | 'description'
    | 'imageUrl'
    | 'domainName'
    | 'priceAmount'
    | 'premiumEnabled'
    | 'premiumAccessDays'
    | 'status'
    | 'modules'
  >;
  creatorFreeCourseCount?: number;
}) {
  const premiumNodeCount = props.course.modules.reduce(
    (sum, module) => sum + module.nodes.filter((node) => node.isPremium).length,
    0
  );
  const freeNodeCount = props.course.modules.reduce(
    (sum, module) => sum + module.nodes.filter((node) => !node.isPremium).length,
    0
  );

  return (
    <CourseMetadataForm
      mode="edit"
      courseId={props.course.id}
      initialValues={{
        title: props.course.title,
        description: props.course.description,
        imageUrl: props.course.imageUrl ?? '',
        domainName: props.course.domainName ?? '',
        priceAmount: String(props.course.priceAmount),
        premiumEnabled: props.course.premiumEnabled,
        premiumAccessDays: props.course.premiumAccessDays ? String(props.course.premiumAccessDays) : '30',
        premiumNodeCount,
        freeNodeCount,
        status: props.course.status,
      }}
      creatorPolicy={{
        freeCourseCount: props.creatorFreeCourseCount,
        currentCourseCountsAsFree: courseCountsAsFree(props.course),
      }}
      submitLabel="Save metadata"
      cancelHref={`/creator/courses/${props.course.id}/modules`}
      onSuccessHref={(courseId) => `/creator/courses/${courseId}/modules`}
      supportingAction={{
        href: `/creator/courses/${props.course.id}/modules`,
        label: 'Manage modules',
      }}
    />
  );
}

