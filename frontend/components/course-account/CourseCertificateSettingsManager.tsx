'use client';

import { useEffect, useState } from 'react';

import { ClientListPaginationControls } from '@/components/ui/ClientListPaginationControls';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { apiJson } from '@/src/presentation/http/client';

type QuizNode = { id: string; title: string; position: number; module_id: string };

type CertificateSettings = {
  enabled: boolean;
  title: string;
  description: string;
  logoUrl: string;
  accentColor: string;
  signatureName: string;
  signatureTitle: string;
  bodyTemplate: string;
  requireAllQuizAttempts: boolean;
  minimumAveragePercent: number;
};

const defaultSettings: CertificateSettings = {
  enabled: true,
  title: 'Certificate of Completion',
  description: '',
  logoUrl: '',
  accentColor: '#f97316',
  signatureName: '',
  signatureTitle: 'Course Creator',
  bodyTemplate: 'This is to certify that {{learnerName}} has successfully completed the course {{courseTitle}}.',
  requireAllQuizAttempts: true,
  minimumAveragePercent: 60,
};

export function CourseCertificateSettingsManager(props: { courseId: string; courseTitle: string; standalone?: boolean }) {
  const [settings, setSettings] = useState<CertificateSettings>(defaultSettings);
  const [quizNodes, setQuizNodes] = useState<QuizNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<10 | 50 | 100>(10);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiJson<{ settings: CertificateSettings; quizNodes: QuizNode[] }>(
        `/api/creator/courses/${props.courseId}/certificate-settings`
      );
      setSettings(response.settings ?? defaultSettings);
      const nextQuizNodes = response.quizNodes ?? [];
      setQuizNodes(nextQuizNodes);
      setPage((current) => Math.min(Math.max(current, 1), Math.max(1, Math.ceil(nextQuizNodes.length / size))));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Certificate settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, [props.courseId]);


  const totalQuizNodes = quizNodes.length;
  const totalQuizPages = Math.max(1, Math.ceil(totalQuizNodes / size));
  const safeQuizPage = Math.min(Math.max(page, 1), totalQuizPages);
  const quizStartIndex = (safeQuizPage - 1) * size;
  const quizEndIndex = Math.min(quizStartIndex + size, totalQuizNodes);
  const visibleQuizNodes = quizNodes.slice(quizStartIndex, quizEndIndex);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiJson(`/api/creator/courses/${props.courseId}/certificate-settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setMessage('Certificate settings saved. Learners can now see certificate eligibility from the course workspace.');
      await loadSettings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Certificate settings could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel stack-lg course-account-section">
      <div className="stack" style={{ gap: 10 }}>
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-primary">Manage certificates</span>
          <span className={`studio-badge ${settings.enabled ? 'studio-badge-success' : 'studio-badge-muted'}`}>{settings.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div>
          <h2 className="panel-title" style={{ marginBottom: 8 }}>Certificate settings</h2>
          <p className="muted" style={{ margin: 0 }}>
            Define the certificate heading, body, logo, signature, and the quiz rules that learners must satisfy before claiming the certificate for {props.courseTitle}.
          </p>
        </div>
      </div>

      {loading ? <div className="card">Loading certificate settings…</div> : null}

      {!loading ? (
        <div className={props.standalone ? 'stack-lg' : 'course-account-grid'}>
          <div className="card stack" style={{ gap: 12 }}>
            <label className="inline" style={{ justifyContent: 'space-between' }}>
              <span className="field-label">Enable certificate for this course</span>
              <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))} />
            </label>
            <Input value={settings.title} onChange={(event) => setSettings((current) => ({ ...current, title: event.target.value }))} placeholder="Certificate of Completion" />
            <TextArea value={settings.description} onChange={(event) => setSettings((current) => ({ ...current, description: event.target.value }))} placeholder="Optional certificate subtitle or note" />
            <Input value={settings.logoUrl} onChange={(event) => setSettings((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="https://example.com/logo.png" />
            <Input value={settings.accentColor} onChange={(event) => setSettings((current) => ({ ...current, accentColor: event.target.value }))} placeholder="#f97316" />
            <div className="grid-2">
              <Input value={settings.signatureName} onChange={(event) => setSettings((current) => ({ ...current, signatureName: event.target.value }))} placeholder="Shivam Kumar" />
              <Input value={settings.signatureTitle} onChange={(event) => setSettings((current) => ({ ...current, signatureTitle: event.target.value }))} placeholder="Lead Instructor" />
            </div>
            <TextArea value={settings.bodyTemplate} onChange={(event) => setSettings((current) => ({ ...current, bodyTemplate: event.target.value }))} placeholder="This is to certify that {{learnerName}} ..." />
            <label className="inline" style={{ justifyContent: 'space-between' }}>
              <span className="field-label">Require all quiz attempts before issuance</span>
              <input type="checkbox" checked={settings.requireAllQuizAttempts} onChange={(event) => setSettings((current) => ({ ...current, requireAllQuizAttempts: event.target.checked }))} />
            </label>
            <Input type="number" min="0" max="100" value={String(settings.minimumAveragePercent)} onChange={(event) => setSettings((current) => ({ ...current, minimumAveragePercent: Number(event.target.value || 0) }))} placeholder="60" />
            <Button type="button" onClick={() => void saveSettings()} disabled={saving}>{saving ? 'Saving…' : 'Save certificate settings'}</Button>
          </div>

          <div className="card stack" style={{ gap: 12 }}>
            <div>
              <div className="field-label">Learner-facing certificate preview</div>
              <p className="muted" style={{ margin: '8px 0 0' }}>This is a structured preview so creators do not break the certificate layout by pasting arbitrary HTML.</p>
            </div>
            <div className="certificate-preview-card" style={{ borderColor: settings.accentColor || '#f97316' }}>
              {settings.logoUrl ? <img src={settings.logoUrl} alt="Certificate logo" className="certificate-preview-logo" /> : <div className="certificate-preview-logo-placeholder">Logo</div>}
              <div className="section-label">Certificate preview</div>
              <h3 className="headline" style={{ fontSize: '2rem', margin: 0 }}>{settings.title || 'Certificate of Completion'}</h3>
              <p className="muted" style={{ textAlign: 'center', maxWidth: 560 }}>
                {(settings.bodyTemplate || defaultSettings.bodyTemplate)
                  .replace('{{learnerName}}', 'Learner Name')
                  .replace('{{courseTitle}}', props.courseTitle)}
              </p>
              <div className="inline" style={{ justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <strong>{settings.signatureName || 'Creator signature'}</strong>
                  <p className="muted" style={{ margin: '6px 0 0' }}>{settings.signatureTitle || 'Course Creator'}</p>
                </div>
                <div className="tag">Issued on completion</div>
              </div>
            </div>
            <div>
              <div className="field-label">Quiz coverage</div>
              <p className="muted" style={{ margin: '8px 0' }}>
                {quizNodes.length === 0
                  ? 'No quiz nodes found yet. Add quiz nodes to make the certificate actionable.'
                  : `${quizNodes.length} quiz node${quizNodes.length === 1 ? '' : 's'} currently contribute to certificate progress.`}
              </p>
              <ClientListPaginationControls
                page={safeQuizPage}
                size={size}
                totalItems={totalQuizNodes}
                totalPages={totalQuizPages}
                startIndex={quizStartIndex}
                endIndex={quizEndIndex}
                noun="quiz nodes"
                onPageChange={setPage}
                onSizeChange={(nextSize) => {
                  setSize(nextSize as 10 | 50 | 100);
                  setPage(1);
                }}
              />
              <div className="stack" style={{ gap: 8 }}>
                {visibleQuizNodes.map((node) => (
                  <div key={node.id} className="inline premium-badge-row" style={{ justifyContent: 'space-between' }}>
                    <span>{node.title}</span>
                    <span className="studio-badge studio-badge-muted">Quiz</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <div className="card">{message}</div> : null}
      {error ? <div className="studio-inline-alert">{error}</div> : null}
    </section>
  );
}


