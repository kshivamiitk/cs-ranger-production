import { ExternalLink, PlayCircle } from 'lucide-react';

import { resolveVideoSource } from '@/lib/video';

export function VideoEmbed(props: { url: string; title: string }) {
  const trimmedUrl = props.url.trim();
  const resolved = resolveVideoSource(trimmedUrl);

  if (!trimmedUrl) {
    return (
      <div className="preview-empty-state compact">
        <PlayCircle size={18} />
        <span>Paste a YouTube, Vimeo, Google Drive, OneDrive, SharePoint, Loom, Dropbox, or direct video URL to preview it here.</span>
      </div>
    );
  }

  if (resolved?.kind === 'embed') {
    return (
      <iframe
        className="html-frame video-frame"
        src={resolved.src}
        title={props.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (resolved?.kind === 'direct') {
    return (
      <video
        className="html-frame video-frame"
        controls
        preload="metadata"
        playsInline
      >
        <source src={resolved.src} type={resolved.mimeType ?? undefined} />
        Your browser does not support inline video playback for this source.
      </video>
    );
  }

  return (
    <div className="preview-link-card">
      <div className="muted">This source cannot be safely embedded in-app, but learners can still open it in a new tab.</div>
      <a href={(resolved?.src ?? trimmedUrl)} target="_blank" rel="noreferrer" className="button button-secondary">
        <ExternalLink size={16} />
        Open source video
      </a>
    </div>
  );
}


