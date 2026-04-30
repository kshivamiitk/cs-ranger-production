'use client';

import { ExternalLink, Github } from 'lucide-react';

import type { GithubNodePayload } from '@/src/domain/models';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';

function canPreviewInIframe(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      host.endsWith('github.io') ||
      host.endsWith('vercel.app') ||
      host.endsWith('netlify.app') ||
      host.endsWith('pages.dev') ||
      host.endsWith('render.com') ||
      host.endsWith('onrender.com') ||
      host === 'localhost'
    );
  } catch {
    return false;
  }
}

export function GithubWebsiteEmbed(props: {
  payload: GithubNodePayload;
  title: string;
}) {
  const previewUrl = props.payload.previewUrl?.trim() ?? '';
  const repositoryUrl = props.payload.repositoryUrl?.trim() ?? '';
  const embeddable = previewUrl.length > 0 && canPreviewInIframe(previewUrl);

  return (
    <section className="node-stage-section github-node-reader">
      <div className="node-stage-section-header github-node-toolbar">
        <div>
          <div className="node-stage-section-label">GitHub website</div>
          <h3 className="panel-title" style={{ margin: 0 }}>{props.title}</h3>
          {props.payload.branch ? <p className="muted" style={{ margin: '6px 0 0' }}>Branch: {props.payload.branch}</p> : null}
        </div>
        <div className="inline">
          {repositoryUrl ? (
            <a className="button button-secondary" href={repositoryUrl} target="_blank" rel="noreferrer">
              <Github size={16} />
              Repository
            </a>
          ) : null}
          {previewUrl ? (
            <a className="button" href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              Live site
            </a>
          ) : null}
        </div>
      </div>

      {props.payload.note ? (
        <div className="github-node-note">
          <RichContentRenderer format="markdown" content={props.payload.note} />
        </div>
      ) : null}

      {embeddable ? (
        <iframe
          className="github-site-frame"
          src={previewUrl}
          title={`${props.title} live website`}
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-same-origin"
        />
      ) : (
        <div className="empty-state github-node-empty">
          <h3>Preview URL is linked but may not allow iframe embedding.</h3>
          <p>
            Use GitHub Pages, Vercel, Netlify, Cloudflare Pages, or another deployed URL that allows iframe previews.
            The repository and live-site buttons will still work.
          </p>
        </div>
      )}
    </section>
  );
}

