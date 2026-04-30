import Link from 'next/link';

type Section = 'overview' | 'pricing' | 'certificates' | 'collaborators';

export function CourseAccountSectionNav(props: { courseId: string; active: Section }) {
  const sections = [
    { key: 'overview', label: 'Overview', href: `/creator/courses/${props.courseId}/account` },
    { key: 'pricing', label: 'Course premium', href: `/creator/courses/${props.courseId}/account/pricing` },
    { key: 'certificates', label: 'Certificate settings', href: `/creator/courses/${props.courseId}/account/certificates` },
    { key: 'collaborators', label: 'Collaborators', href: `/creator/courses/${props.courseId}/account/collaborators` },
  ] as const;

  return (
    <nav className="course-account-tab-nav" aria-label="Course account sections">
      {sections.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          className={`course-account-tab-link${props.active === section.key ? ' is-active' : ''}`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}


