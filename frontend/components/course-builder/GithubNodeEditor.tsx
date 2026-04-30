'use client';

import type { GithubNodePayload } from '@/src/domain/models';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';

export function GithubNodeEditor(props: {
  payload: GithubNodePayload;
  onChange: (payload: GithubNodePayload) => void;
}) {
  function update<K extends keyof GithubNodePayload>(key: K, value: GithubNodePayload[K]) {
    props.onChange({ ...props.payload, [key]: value });
  }

  return (
    <section className="node-editor-panel stack-lg">
      <div className="node-editor-panel-heading">
        <div>
          <div className="section-label">GitHub website node</div>
          <h3 className="panel-title" style={{ margin: 0 }}>Embed a complete course website</h3>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Paste your GitHub repository and deployed preview URL. The deployed site opens inside the same learner box used by HTML nodes.
          </p>
        </div>
      </div>

      <label className="field">
        <span className="field-label">GitHub repository URL</span>
        <Input
          value={props.payload.repositoryUrl}
          onChange={(event) => update('repositoryUrl', event.target.value)}
          placeholder="https://github.com/username/course-website"
          required
        />
      </label>

      <label className="field">
        <span className="field-label">Live preview URL</span>
        <Input
          value={props.payload.previewUrl}
          onChange={(event) => update('previewUrl', event.target.value)}
          placeholder="https://username.github.io/course-website/"
          required
        />
        <span className="muted">GitHub repository pages are usually blocked from iframes, so use GitHub Pages, Vercel, Netlify, Cloudflare Pages, or another deployed URL.</span>
      </label>

      <label className="field">
        <span className="field-label">Branch</span>
        <Input
          value={props.payload.branch ?? ''}
          onChange={(event) => update('branch', event.target.value)}
          placeholder="main"
        />
      </label>

      <label className="field">
        <span className="field-label">Learner notes</span>
        <TextArea
          value={props.payload.note}
          onChange={(event) => update('note', event.target.value)}
          rows={6}
          placeholder="Tell learners how to use the embedded site."
          required
        />
      </label>
    </section>
  );
}

