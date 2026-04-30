import { redirect } from 'next/navigation';

export default async function CreatorCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/creator/courses/${courseId}/modules`);
}


