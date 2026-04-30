import { AppShell } from '@/components/app-shell/AppShell';
import { formatDateLabel } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerAdmin } from '@/src/presentation/serverPage';

export default async function AdminCertificatesPage() {
  const [{ viewer, themeMode }, { certificateService }] = await Promise.all([
    requireServerAdmin('/admin/certificates'),
    createServerContainer(),
  ]);
  const issuedCertificates = await certificateService.getAdminIssuedCertificates(viewer);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin"
      title="Issued certificates"
      subtitle="Certificates issued across all courses, tied to templates and learner progress."
    >
      <section className="panel stack">
        {issuedCertificates.length === 0 ? (
          <div className="empty-state">No certificates have been issued yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Learner</th>
                  <th>Template</th>
                  <th>Code</th>
                  <th>Issued</th>
                </tr>
              </thead>
              <tbody>
                {issuedCertificates.map((certificate) => (
                  <tr key={certificate.id}>
                    <td>{certificate.courseTitle ?? certificate.courseId}</td>
                    <td>{certificate.learnerName ?? certificate.learnerUserId}</td>
                    <td>{certificate.templateTitle ?? certificate.templateId}</td>
                    <td>{certificate.certificateCode}</td>
                    <td>{formatDateLabel(certificate.issuedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}


