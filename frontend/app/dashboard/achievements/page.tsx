import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { requireServerPageContext } from '@/src/presentation/serverPage';
import { formatDateLabel } from '@/lib/utils';
import { getSupportUnreadCountForViewer, listSupportThreadsForViewer } from '@/src/server/adminSupport';

function buildCertificateDownloadHref(certificate: any, courseTitle: string, learnerName: string) {
  if (certificate.pdf_url) {
    return certificate.pdf_url as string;
  }

  const payload = certificate.render_payload ?? {};
  const lines = [
    'CS Ranger Certificate',
    `Learner: ${payload.learnerName ?? learnerName}`,
    `Course: ${courseTitle}`,
    `Certificate code: ${certificate.certificate_code}`,
    `Issued on: ${formatDateLabel(certificate.issued_at)}`,
  ];
  return `data:text/plain;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`;
}

export default async function LearnerAchievementsPage() {
  const { viewer, themeMode, container } = await requireServerPageContext('/dashboard/achievements');
  const { learnerDashboardService } = container;

  const [dashboard, supportThreads] = await Promise.all([
    learnerDashboardService.getDashboard(viewer, { includeFeed: false }),
    listSupportThreadsForViewer(viewer),
  ]);

  const supabase = createServiceRoleSupabaseClient();
  const { data: issuedCertificates, error } = await supabase
    .from('issued_certificates')
    .select('id, course_id, certificate_code, issued_at, pdf_url, render_payload')
    .eq('learner_user_id', viewer.user.id)
    .order('issued_at', { ascending: false });

  if (error) {
    throw error;
  }

  const courseIds = [...new Set((issuedCertificates ?? []).map((row: any) => row.course_id))];
  const { data: courses } = courseIds.length
    ? await supabase.from('courses').select('id, title, creator_user_id').in('id', courseIds)
    : { data: [] as any[] };
  const creatorIds = [...new Set((courses ?? []).map((row: any) => row.creator_user_id))];
  const { data: creators } = creatorIds.length
    ? await supabase.from('user_profiles').select('user_id, full_name').in('user_id', creatorIds)
    : { data: [] as any[] };
  const courseMap = new Map((courses ?? []).map((row: any) => [row.id, row]));
  const creatorMap = new Map((creators ?? []).map((row: any) => [row.user_id, row.full_name]));
  const achievedBadges = dashboard.badges.filter((badge) => badge.achieved);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Achievements"
      subtitle="One premium shelf for your earned badges and issued certificates, including fast certificate downloads."
      unreadCounts={{
        feed: 0,
        support: getSupportUnreadCountForViewer(viewer, supportThreads),
        notifications: 0,
      }}
    >
      <div className="stack-lg">
        <section className="panel stack-lg">
          <div className="panel-header">
            <div>
              <h2 className="panel-title" style={{ margin: 0 }}>Badges</h2>
              <p className="muted" style={{ marginTop: 8 }}>Milestones you have already earned from consistent learning activity.</p>
            </div>
          </div>
          {achievedBadges.length === 0 ? (
            <div className="empty-state">No badges yet. Complete nodes and submit quizzes to start unlocking milestones.</div>
          ) : (
            <div className="v12-achievements-grid">
              {achievedBadges.map((badge) => (
                <article key={badge.id} className="panel v12-achievement-card stack">
                  <div className="inline premium-badge-row">
                    <span className="studio-badge studio-badge-success">Earned badge</span>
                    {badge.achievedAt ? <span className="studio-badge studio-badge-muted">{formatDateLabel(badge.achievedAt)}</span> : null}
                  </div>
                  <h3 className="panel-title" style={{ margin: 0 }}>{badge.label}</h3>
                  <p className="muted" style={{ margin: 0 }}>{badge.description}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel stack-lg">
          <div className="panel-header">
            <div>
              <h2 className="panel-title" style={{ margin: 0 }}>Certificates</h2>
              <p className="muted" style={{ marginTop: 8 }}>Issued certificates remain one click away, with direct download access.</p>
            </div>
          </div>
          {(issuedCertificates ?? []).length === 0 ? (
            <div className="empty-state">No certificates issued yet. Complete certificate-eligible courses to populate this shelf.</div>
          ) : (
            <div className="v12-achievements-grid">
              {(issuedCertificates ?? []).map((certificate: any) => {
                const course = courseMap.get(certificate.course_id);
                const creatorName = course ? creatorMap.get(course.creator_user_id) : null;
                return (
                  <article key={certificate.id} className="panel v12-certificate-card stack">
                    <div className="inline premium-badge-row">
                      <span className="studio-badge studio-badge-primary">Certificate</span>
                      <span className="studio-badge studio-badge-muted">{formatDateLabel(certificate.issued_at)}</span>
                    </div>
                    <h3 className="panel-title" style={{ margin: 0 }}>{course?.title ?? 'Course certificate'}</h3>
                    <p className="muted" style={{ margin: 0 }}>Creator: {creatorName ?? 'Unknown creator'}</p>
                    <p className="muted" style={{ margin: 0 }}>Code: {certificate.certificate_code}</p>
                    <div className="inline" style={{ gap: 10, flexWrap: 'wrap' }}>
                      <a
                        href={buildCertificateDownloadHref(certificate, course?.title ?? 'Course certificate', viewer.profile.fullName ?? viewer.user.email)}
                        download={`${(course?.title ?? 'certificate').replace(/\s+/g, '-').toLowerCase()}-certificate.txt`}
                        className="button"
                      >
                        Download certificate
                      </a>
                      {course ? <Link href={`/courses/${course.id}`} className="button button-secondary">Open course</Link> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
