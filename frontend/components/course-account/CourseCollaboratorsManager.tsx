'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { apiJson } from '@/src/presentation/http/client';
import { ClientListPaginationControls } from '@/components/ui/ClientListPaginationControls';
import { UserAvatar } from '@/components/user/UserAvatar';

type PublicUser = {
  userId: string;
  fullName: string | null;
  username?: string | null;
  profilePhotoUrl: string | null;
};

type Collaborator = {
  courseId: string;
  userId: string;
  role: 'editor';
  createdAt: string;
  user: PublicUser | null;
};

type Invite = {
  id: string;
  courseId: string;
  courseTitle: string | null;
  inviterUserId: string;
  inviteeUserId: string;
  role: 'editor';
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  inviter: PublicUser | null;
  invitee: PublicUser | null;
};

type Access = {
  isOwner: boolean;
  canEditContent: boolean;
  canManageCollaborators: boolean;
};

export function CourseCollaboratorsManager(props: { courseId: string; courseTitle: string; standalone?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [message, setMessage] = useState('');
  const [collaboratorPage, setCollaboratorPage] = useState(1);
  const [collaboratorSize, setCollaboratorSize] = useState<10 | 50 | 100>(10);
  const [invitePage, setInvitePage] = useState(1);
  const [inviteSize, setInviteSize] = useState<10 | 50 | 100>(10);


  const collaboratorTotalItems = collaborators.length;
  const collaboratorTotalPages = Math.max(1, Math.ceil(collaboratorTotalItems / collaboratorSize));
  const safeCollaboratorPage = Math.min(Math.max(collaboratorPage, 1), collaboratorTotalPages);
  const collaboratorStartIndex = (safeCollaboratorPage - 1) * collaboratorSize;
  const collaboratorEndIndex = Math.min(collaboratorStartIndex + collaboratorSize, collaboratorTotalItems);
  const visibleCollaborators = collaborators.slice(collaboratorStartIndex, collaboratorEndIndex);

  const inviteTotalItems = pendingInvites.length;
  const inviteTotalPages = Math.max(1, Math.ceil(inviteTotalItems / inviteSize));
  const safeInvitePage = Math.min(Math.max(invitePage, 1), inviteTotalPages);
  const inviteStartIndex = (safeInvitePage - 1) * inviteSize;
  const inviteEndIndex = Math.min(inviteStartIndex + inviteSize, inviteTotalItems);
  const visibleInvites = pendingInvites.slice(inviteStartIndex, inviteEndIndex);

  async function loadWorkspace() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiJson<{ access: Access; collaborators: Collaborator[]; pendingInvites: Invite[] }>(
        `/api/creator/courses/${props.courseId}/collaborators`,
      );
      setAccess(response.access);
      const nextCollaborators = response.collaborators ?? [];
      const nextInvites = response.pendingInvites ?? [];
      setCollaborators(nextCollaborators);
      setPendingInvites(nextInvites);
      setCollaboratorPage((current) => Math.min(Math.max(current, 1), Math.max(1, Math.ceil(nextCollaborators.length / collaboratorSize))));
      setInvitePage((current) => Math.min(Math.max(current, 1), Math.max(1, Math.ceil(nextInvites.length / inviteSize))));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Collaborators could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [props.courseId]);

  async function runSearch() {
    setError(null);
    try {
      const response = await apiJson<{ creators: PublicUser[] }>(`/api/creator/collaborator-search?q=${encodeURIComponent(search)}`);
      setResults(response.creators ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed.');
    }
  }

  async function invite(username: string) {
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/creator/courses/${props.courseId}/collaborators`, {
        method: 'POST',
        body: JSON.stringify({ username, message }),
      });
      setMessage('');
      setSearch('');
      setResults([]);
      await loadWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invite failed.');
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/creator/courses/${props.courseId}/collaborators/invites/${inviteId}`, { method: 'DELETE' });
      await loadWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invite could not be revoked.');
    } finally {
      setSaving(false);
    }
  }

  async function removeCollaborator(collaboratorUserId: string) {
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/creator/courses/${props.courseId}/collaborators/${collaboratorUserId}`, { method: 'DELETE' });
      await loadWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Collaborator could not be removed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel stack-lg course-account-section">
      <div className="stack" style={{ gap: 10 }}>
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-primary">Course collaborators</span>
          <span className="studio-badge studio-badge-muted">Search by unique username and invite co-creators</span>
        </div>
        <div>
          <h2 className="panel-title" style={{ marginBottom: 8 }}>Collaborator workspace</h2>
          <p className="muted" style={{ margin: 0 }}>
            {props.courseTitle} can now have GitHub-style collaborators. The owner keeps pricing, payout, and publishing control. Collaborators can edit modules and nodes and will see this course in their creator dashboard too.
          </p>
        </div>
      </div>

      {loading ? <div className="card">Loading collaborators…</div> : null}

      {access?.canManageCollaborators ? (
        <div className={props.standalone ? 'stack-lg' : 'course-account-grid'}>
          <div className="card stack" style={{ gap: 12 }}>
            <div>
              <div className="field-label">Invite by username</div>
              <p className="muted" style={{ margin: '8px 0 0' }}>Type a creator username like <strong>@someone</strong> without the @ sign.</p>
            </div>
            <div className="inline" style={{ gap: 10 }}>
              <Input value={search} onChange={(event) => setSearch(event.target.value.toLowerCase().replace(/^@+/, ''))} placeholder="creator_username" />
              <Button type="button" variant="secondary" onClick={() => void runSearch()} disabled={!search.trim() || saving}>Search</Button>
            </div>
            <TextArea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Optional note for the collaborator request." />
            {results.length === 0 ? <div className="muted">No search results yet.</div> : null}
            {results.map((user) => (
              <div key={user.userId} className="card" style={{ padding: 14 }}>
                <div className="panel-header">
                  <div className="inline" style={{ gap: 12, alignItems: 'center' }}>
                    <UserAvatar src={user.profilePhotoUrl} name={user.fullName ?? user.username ?? 'Creator'} alt={user.fullName ?? user.username ?? 'Creator'} size="md" />
                    <div>
                      <strong>{user.fullName ?? 'Creator'}</strong>
                      <p className="muted" style={{ margin: '6px 0 0' }}>@{user.username ?? 'unknown'}</p>
                    </div>
                  </div>
                  <Button type="button" onClick={() => void invite(user.username ?? '')} disabled={saving || !user.username}>Invite</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="stack" style={{ gap: 12 }}>
            <div className="card stack" style={{ gap: 12 }}>
              <div>
                <strong>Active collaborators</strong>
                <p className="muted" style={{ margin: '8px 0 0' }}>These creators can open the course from their own creator dashboard.</p>
              </div>
              <ClientListPaginationControls
                page={safeCollaboratorPage}
                size={collaboratorSize}
                totalItems={collaboratorTotalItems}
                totalPages={collaboratorTotalPages}
                startIndex={collaboratorStartIndex}
                endIndex={collaboratorEndIndex}
                noun="collaborators"
                onPageChange={setCollaboratorPage}
                onSizeChange={(nextSize) => {
                  setCollaboratorSize(nextSize as 10 | 50 | 100);
                  setCollaboratorPage(1);
                }}
              />
              {collaborators.length === 0 ? <div className="muted">No collaborators yet.</div> : null}
              {visibleCollaborators.map((collaborator) => (
                <div key={collaborator.userId} className="panel-header">
                  <div className="inline" style={{ gap: 12, alignItems: 'center' }}>
                    <UserAvatar src={collaborator.user?.profilePhotoUrl ?? null} name={collaborator.user?.fullName ?? collaborator.user?.username ?? 'Creator'} alt={collaborator.user?.fullName ?? collaborator.user?.username ?? 'Creator'} size="md" />
                    <div>
                      <strong>{collaborator.user?.fullName ?? 'Creator'}</strong>
                      <p className="muted" style={{ margin: '6px 0 0' }}>@{collaborator.user?.username ?? 'unknown'} · {collaborator.role}</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => void removeCollaborator(collaborator.userId)} disabled={saving}>Remove</Button>
                </div>
              ))}
            </div>

            <div className="card stack" style={{ gap: 12 }}>
              <div>
                <strong>Pending invites</strong>
                <p className="muted" style={{ margin: '8px 0 0' }}>Outstanding collaboration requests for this course.</p>
              </div>
              <ClientListPaginationControls
                page={safeInvitePage}
                size={inviteSize}
                totalItems={inviteTotalItems}
                totalPages={inviteTotalPages}
                startIndex={inviteStartIndex}
                endIndex={inviteEndIndex}
                noun="pending invites"
                onPageChange={setInvitePage}
                onSizeChange={(nextSize) => {
                  setInviteSize(nextSize as 10 | 50 | 100);
                  setInvitePage(1);
                }}
              />
              {pendingInvites.length === 0 ? <div className="muted">No pending invites.</div> : null}
              {visibleInvites.map((invite) => (
                <div key={invite.id} className="panel-header">
                  <div>
                    <strong>{invite.invitee?.fullName ?? 'Creator'}</strong>
                    <p className="muted" style={{ margin: '6px 0 0' }}>@{invite.invitee?.username ?? 'unknown'}</p>
                    {invite.message ? <p className="muted" style={{ margin: '6px 0 0' }}>{invite.message}</p> : null}
                  </div>
                  <Button type="button" variant="ghost" onClick={() => void revokeInvite(invite.id)} disabled={saving}>Revoke</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {access && !access.canManageCollaborators ? (
        <div className="card stack" style={{ gap: 10 }}>
          <strong>You are collaborating on this course.</strong>
          <p className="muted" style={{ margin: 0 }}>You can edit the learning content, but only the course owner can invite or remove collaborators, manage pricing, and control publishing.</p>
          {collaborators.length > 0 ? (
            <div className="inline premium-badge-row">
              {collaborators.map((collaborator) => (
                <span key={collaborator.userId} className="studio-badge studio-badge-muted">@{collaborator.user?.username ?? 'creator'}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="studio-inline-alert">{error}</div> : null}
    </section>
  );
}


