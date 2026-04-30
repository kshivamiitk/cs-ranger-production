export type ResolvedVideoSource =
  | { kind: "embed"; src: string }
  | { kind: "direct"; src: string; mimeType?: string | null }
  | { kind: "external"; src: string };

const directVideoExtensions = new Map<string, string>([
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.ogg', 'video/ogg'],
  ['.mov', 'video/quicktime'],
  ['.m4v', 'video/x-m4v'],
]);

function appendOrSet(url: URL, key: string, value: string) {
  url.searchParams.set(key, value);
  return url.toString();
}

function getGoogleDriveFileId(url: URL) {
  const pathnameParts = url.pathname.split('/').filter(Boolean);
  const fileIndex = pathnameParts.indexOf('d');
  if (fileIndex >= 0 && pathnameParts[fileIndex + 1]) {
    return pathnameParts[fileIndex + 1];
  }

  return url.searchParams.get('id');
}

function resolveDirectVideo(url: URL) {
  const loweredPath = url.pathname.toLowerCase();
  for (const [extension, mimeType] of directVideoExtensions.entries()) {
    if (loweredPath.endsWith(extension)) {
      return { kind: 'direct' as const, src: url.toString(), mimeType };
    }
  }

  if (url.searchParams.get('raw') === '1' || url.searchParams.get('download') === '1') {
    return { kind: 'direct' as const, src: url.toString(), mimeType: null };
  }

  return null;
}

export function resolveVideoSource(rawUrl: string): ResolvedVideoSource | null {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    return null;
  }

  try {
    const url = new URL(trimmedUrl);
    const host = url.hostname.replace(/^www\./, '');
    const directVideo = resolveDirectVideo(url);
    if (directVideo) {
      return directVideo;
    }

    if (host === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId ? { kind: 'embed', src: `https://www.youtube.com/embed/${videoId}` } : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/embed/')) {
        return { kind: 'embed', src: url.toString() };
      }

      if (url.pathname === '/watch') {
        const videoId = url.searchParams.get('v');
        return videoId ? { kind: 'embed', src: `https://www.youtube.com/embed/${videoId}` } : null;
      }

      if (url.pathname.startsWith('/shorts/')) {
        const videoId = url.pathname.split('/').filter(Boolean)[1];
        return videoId ? { kind: 'embed', src: `https://www.youtube.com/embed/${videoId}` } : null;
      }
    }

    if (host === 'player.vimeo.com') {
      return { kind: 'embed', src: url.toString() };
    }

    if (host === 'vimeo.com') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId ? { kind: 'embed', src: `https://player.vimeo.com/video/${videoId}` } : null;
    }

    if (host === 'drive.google.com') {
      const fileId = getGoogleDriveFileId(url);
      return fileId ? { kind: 'embed', src: `https://drive.google.com/file/d/${fileId}/preview` } : { kind: 'external', src: url.toString() };
    }

    if (host === 'docs.google.com' && url.pathname.includes('/file/d/')) {
      const fileId = getGoogleDriveFileId(url);
      return fileId ? { kind: 'embed', src: `https://drive.google.com/file/d/${fileId}/preview` } : { kind: 'external', src: url.toString() };
    }

    if (host === 'loom.com' || host === 'www.loom.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      const shareIndex = parts.indexOf('share');
      const videoId = shareIndex >= 0 ? parts[shareIndex + 1] : null;
      return videoId ? { kind: 'embed', src: `https://www.loom.com/embed/${videoId}` } : { kind: 'external', src: url.toString() };
    }

    if (host === 'dropbox.com' || host.endsWith('.dropbox.com')) {
      const directUrl = new URL(url.toString());
      directUrl.searchParams.set('raw', '1');
      const maybeDirect = resolveDirectVideo(directUrl);
      if (maybeDirect) {
        return maybeDirect;
      }
      return { kind: 'external', src: directUrl.toString() };
    }

    if (host === 'onedrive.live.com' || host === '1drv.ms' || host.endsWith('.sharepoint.com')) {
      const embedUrl = new URL(url.toString());
      embedUrl.searchParams.set('embed', '1');
      embedUrl.searchParams.set('em', '2');
      return { kind: 'embed', src: embedUrl.toString() };
    }

    return { kind: 'external', src: url.toString() };
  } catch {
    return null;
  }
}

export function resolveVideoEmbedUrl(rawUrl: string): string | null {
  const resolved = resolveVideoSource(rawUrl);
  return resolved?.kind === 'embed' ? resolved.src : null;
}


