'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { ThemeMode } from '@/src/domain/models';
import { apiJson } from '@/src/presentation/http/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { UserAvatar } from '@/components/user/UserAvatar';

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'ember', label: 'Ember' },
];

export function ProfileSettingsForm(props: {
  fullName: string;
  username: string;
  profilePhotoUrl: string;
  bio: string;
  themeMode: ThemeMode;
  githubUsername: string;
  githubProfileUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(props.fullName);
  const [username, setUsername] = useState(props.username);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(props.profilePhotoUrl);
  const [bio, setBio] = useState(props.bio);
  const [themeMode, setThemeMode] = useState<ThemeMode>(props.themeMode);
  const [githubUsername, setGithubUsername] = useState(props.githubUsername);
  const [githubProfileUrl, setGithubProfileUrl] = useState(props.githubProfileUrl);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);

  const previewName = useMemo(() => fullName.trim() || 'Your profile', [fullName]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await apiJson('/api/profile', {
          method: 'PATCH',
          body: JSON.stringify({
            fullName,
            username,
            profilePhotoUrl,
            bio,
            themeMode,
            githubUsername,
            githubProfileUrl,
          }),
        });
        document.documentElement.dataset.theme = themeMode;
        setMessage('Profile updated.');
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Profile update failed.');
      }
    });
  }

  function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhotoStatus(null);
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Select a valid image file.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Choose an image smaller than 1 MB for the current profile-photo flow.');
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setError('Image preview failed. Please try another file.');
        return;
      }
      setProfilePhotoUrl(result);
      setPhotoStatus(`${file.name} ready to save.`);
    };
    reader.onerror = () => {
      setError('Image upload failed while reading the file.');
    };
    reader.readAsDataURL(file);
  }

  return (
    <form className="panel stack-lg" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Full name</span>
        <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      </label>

      <label className="field">
        <span className="field-label">Username</span>
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          autoComplete="username"
          required
        />
        <p className="muted" style={{ margin: '8px 0 0' }}>Your username must be unique. Other creators can search for this username when inviting you as a course collaborator.</p>
      </label>

      <div className="field stack" style={{ gap: 12 }}>
        <span className="field-label">Profile photo</span>
        <div className="profile-photo-uploader">
          <UserAvatar src={profilePhotoUrl} name={previewName} alt={previewName} size="lg" />
          <div className="stack" style={{ gap: 10 }}>
            <label className="button button-secondary profile-photo-upload-button">
              <input type="file" accept="image/*" onChange={handlePhotoSelected} className="sr-only" />
              Upload image
            </label>
            <div className="muted" style={{ maxWidth: 440 }}>
              Choose an image instead of pasting a link. The current version stores the uploaded image directly as your profile photo so the navbar avatar updates everywhere.
            </div>
            {photoStatus ? <div style={{ color: 'var(--success)' }}>{photoStatus}</div> : null}
            {profilePhotoUrl ? (
              <button type="button" className="button button-ghost" onClick={() => setProfilePhotoUrl('')}>
                Remove photo
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <label className="field">
        <span className="field-label">Bio</span>
        <TextArea value={bio} onChange={(event) => setBio(event.target.value)} rows={6} placeholder="Tell other learners and creators a bit about yourself." />
      </label>


      <section className="card stack" style={{ gap: 12 }}>
        <div>
          <span className="field-label">GitHub course identity</span>
          <p className="muted" style={{ margin: '6px 0 0' }}>Linking this lets you use GitHub website nodes confidently when you publish course websites from your repositories.</p>
        </div>
        <label className="field">
          <span className="field-label">GitHub username</span>
          <Input
            value={githubUsername}
            onChange={(event) => setGithubUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="your-github-handle"
          />
        </label>
        <label className="field">
          <span className="field-label">GitHub profile URL</span>
          <Input
            value={githubProfileUrl}
            onChange={(event) => setGithubProfileUrl(event.target.value)}
            placeholder="https://github.com/your-github-handle"
          />
        </label>
      </section>

      <label className="field">
        <span className="field-label">Theme mode</span>
        <Select value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </label>

      {message ? <div style={{ color: 'var(--success)' }}>{message}</div> : null}
      {error ? <div style={{ color: 'var(--danger)' }}>{error}</div> : null}

      <div className="inline">
        <Button type="submit" disabled={pending}>Save profile</Button>
      </div>
    </form>
  );
}


