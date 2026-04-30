'use client';

import { CourseMetadataForm } from '@/components/course-builder/CourseMetadataForm';

export function NewCourseForm(props: {
  creatorFreeCourseCount?: number;
}) {
  return (
    <CourseMetadataForm
      mode="create"
      initialValues={{
        title: '',
        description: '',
        imageUrl: '',
        domainName: '',
        priceAmount: '0',
        premiumEnabled: false,
        premiumAccessDays: '30',
        premiumNodeCount: 0,
        freeNodeCount: 0,
        status: 'draft',
      }}
      creatorPolicy={{ freeCourseCount: props.creatorFreeCourseCount }}
      submitLabel="Create course"
      cancelHref="/creator/courses"
      onSuccessHref={(courseId) => `/creator/courses/${courseId}/modules`}
    />
  );
}

