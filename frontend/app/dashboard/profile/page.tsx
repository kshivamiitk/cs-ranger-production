import { AppShell } from '@/components/app-shell/AppShell';
import { ProfileSettingsForm } from '@/components/profile/ProfileSettingsForm';
import { UserAvatar } from '@/components/user/UserAvatar';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerViewer } from '@/src/presentation/serverPage';

export default async function ProfileSettingsPage() {
  const [{ viewer, themeMode }, { userProfileService }] = await Promise.all([
    requireServerViewer('/dashboard/profile'),
    createServerContainer(),
  ]);
  const profile = await userProfileService.getOwnProfile(viewer);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Profile Settings"
      subtitle="Update your full name, reserve your unique username, upload a richer profile image, refine your bio, and manage your theme mode from one persistent viewer profile surface."
    >
      <section className="profile-settings-layout">
        <section className="panel stack-lg">
          <UserAvatar
            src={profile.profilePhotoUrl}
            name={profile.fullName ?? viewer.user.fullName ?? viewer.user.email}
            alt={profile.fullName ?? viewer.user.email}
            size="lg"
          />
          <div className="stack" style={{ gap: 8 }}>
            <div className="section-label">Account overview</div>
            <h2 className="panel-title" style={{ margin: 0 }}>{profile.fullName ?? viewer.user.email}</h2>
            <p className="muted" style={{ margin: 0 }}>@{profile.username ?? 'set_username'}</p>
            <p className="muted" style={{ margin: 0 }}>{profile.bio ?? 'Add a short bio so creators and learners can identify you across course pages and creator pages.'}</p>
          </div>
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-primary">{profile.primaryRole}</span>
            {profile.isAdmin ? <span className="studio-badge studio-badge-success">admin</span> : null}
          </div>
        </section>

        <ProfileSettingsForm
          fullName={profile.fullName ?? ''}
          profilePhotoUrl={profile.profilePhotoUrl ?? ''}
          username={profile.username ?? ''}
          bio={profile.bio ?? ''}
          themeMode={profile.themeMode}
        />
      </section>
    </AppShell>
  );
}

