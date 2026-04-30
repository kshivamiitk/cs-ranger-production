'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiJson } from '@/src/presentation/http/client';

export interface HtmlSandboxNavigation {
  nextHref?: string | null;
  previousHref?: string | null;
  courseHref?: string | null;
}

export interface HtmlSandboxProps {
  html: string;
  css: string;
  javascript: string;
  title?: string;
  courseId?: string;
  nodeId?: string;
  progressEnabled?: boolean;
  navigation?: HtmlSandboxNavigation;
}

type HtmlRuntimeMessage = {
  source?: string;
  type?: string;
  href?: string;
  detail?: string;
};

const HTML_RUNTIME_SOURCE = 'cs-ranger-html-node-runtime';

function escapeScriptSource(value: string) {
  return value.replace(/<\/script/gi, '<\\/script');
}

function escapeStyleSource(value: string) {
  return value.replace(/<\/style/gi, '<\\/style');
}

function extractAttribute(tag: string, name: string) {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(pattern);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? '';
}

function isExternalAsset(value: string) {
  return /^(https?:|data:|blob:|\/\/|mailto:|tel:|#)/i.test(value.trim());
}

function isLocalCssAsset(value: string) {
  const normalized = value.trim().replace(/^\.\//, '').replace(/^\//, '').toLowerCase();
  return !isExternalAsset(value) && /(^|\/)(style|styles|index|main|app|node)\.css(\?.*)?$/.test(normalized);
}

function isLocalJsAsset(value: string) {
  const normalized = value.trim().replace(/^\.\//, '').replace(/^\//, '').toLowerCase();
  return !isExternalAsset(value) && /(^|\/)(script|scripts|index|main|app|node)\.(mjs|js)(\?.*)?$/.test(normalized);
}

function removeLocalAssetReferences(html: string) {
  return html
    .replace(/<link\b[^>]*>/gi, (tag) => {
      const rel = extractAttribute(tag, 'rel').toLowerCase();
      const href = extractAttribute(tag, 'href');
      if (rel.includes('stylesheet') && href && isLocalCssAsset(href)) {
        return '<!-- CS Ranger v22.8 injected the CSS pane here. -->';
      }
      return tag;
    })
    .replace(/<script\b[^>]*\bsrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)[^>]*>\s*<\/script>/gis, (tag) => {
      const src = extractAttribute(tag, 'src');
      if (src && isLocalJsAsset(src)) {
        return '<!-- CS Ranger v22.8 injected the JavaScript pane here. -->';
      }
      return tag;
    });
}

function looksLikeHtmlDocument(html: string) {
  return /<!doctype\s+html|<html[\s>]/i.test(html);
}

function looksLikeJavaScriptModule(javascript: string) {
  return /(^|\n)\s*import\s+|(^|\n)\s*export\s+/m.test(javascript);
}

function insertBeforeClosingTag(document: string, tag: 'head' | 'body', insertion: string) {
  const closingPattern = new RegExp(`</${tag}>`, 'i');
  if (closingPattern.test(document)) {
    return document.replace(closingPattern, `${insertion}\n</${tag}>`);
  }

  if (tag === 'head') {
    return document.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${insertion}</head>`);
  }

  return `${document}\n${insertion}`;
}

function runtimeBridgeScript() {
  return `
(function () {
  const source = '${HTML_RUNTIME_SOURCE}';
  const send = (type, extra) => {
    try {
      window.parent.postMessage(Object.assign({ source, type }, extra || {}), '*');
    } catch (error) {}
  };

  const memoryStorage = (() => {
    const store = new Map();
    return {
      get length() { return store.size; },
      key(index) { return Array.from(store.keys())[index] || null; },
      getItem(key) { return store.has(String(key)) ? store.get(String(key)) : null; },
      setItem(key, value) { store.set(String(key), String(value)); },
      removeItem(key) { store.delete(String(key)); },
      clear() { store.clear(); }
    };
  })();

  try {
    window.localStorage.setItem('__csranger_test__', '1');
    window.localStorage.removeItem('__csranger_test__');
  } catch (error) {
    try {
      Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true });
      Object.defineProperty(window, 'sessionStorage', { value: memoryStorage, configurable: true });
    } catch (ignored) {}
  }

  const actions = {
    next: () => send('navigate-next'),
    previous: () => send('navigate-previous'),
    back: () => send('navigate-previous'),
    course: () => send('navigate-course'),
    complete: () => send('mark-complete'),
    markComplete: () => send('mark-complete')
  };

  window.CSRanger = Object.freeze({
    goToNextNode: actions.next,
    goToPreviousNode: actions.previous,
    goToCourse: actions.course,
    markComplete: actions.complete,
    navigate: (href) => send('navigate-href', { href: String(href || '') }),
    onReady: (callback) => {
      if (typeof callback !== 'function') return;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
      } else {
        callback();
      }
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-csranger-action], [data-action], a[href]') : null;
    if (!target) return;

    const action = target.getAttribute('data-csranger-action') || target.getAttribute('data-action');
    const href = target.getAttribute('href') || '';
    const normalizedAction = String(action || '').trim().toLowerCase();
    const normalizedHref = href.trim().toLowerCase();

    if (actions[normalizedAction]) {
      event.preventDefault();
      actions[normalizedAction]();
      return;
    }

    if (normalizedHref === 'csranger://next' || normalizedHref === '#next') {
      event.preventDefault();
      actions.next();
      return;
    }

    if (normalizedHref === 'csranger://previous' || normalizedHref === '#previous') {
      event.preventDefault();
      actions.previous();
      return;
    }

    if (normalizedHref === 'csranger://complete' || normalizedHref === '#complete') {
      event.preventDefault();
      actions.complete();
      return;
    }

    if (normalizedHref.endsWith('/next.html') || normalizedHref === 'next.html') {
      event.preventDefault();
      actions.next();
      return;
    }

    if (normalizedHref.endsWith('/previous.html') || normalizedHref === 'previous.html' || normalizedHref.endsWith('/back.html') || normalizedHref === 'back.html') {
      event.preventDefault();
      actions.previous();
      return;
    }

    if (href.startsWith('/courses/') || href === '/courses' || href.startsWith('/dashboard')) {
      event.preventDefault();
      send('navigate-href', { href });
      return;
    }
  }, true);

  window.addEventListener('error', (event) => {
    send('runtime-error', { detail: event.message || 'JavaScript runtime error.' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    send('runtime-error', { detail: event.reason && event.reason.message ? event.reason.message : 'Unhandled JavaScript promise rejection.' });
  });
})();`;
}

function userScript(javascript: string) {
  const source = escapeScriptSource(javascript);
  const isModule = looksLikeJavaScriptModule(javascript);

  if (isModule) {
    return `<script type="module">
window.addEventListener('error', (event) => {
  window.parent.postMessage({ source: '${HTML_RUNTIME_SOURCE}', type: 'runtime-error', detail: event.message || 'JavaScript module runtime error.' }, '*');
});
${source}
</script>`;
  }

  return `<script data-csranger-user-script="classic">
${source}
</script>`;
}

function buildSourceDocument(html: string, css: string, javascript: string) {
  const cleanedHtml = removeLocalAssetReferences(html);
  const styleTag = `<style data-csranger-style="combined-css-pane">\n${escapeStyleSource(css)}\n</style>`;
  const runtimeTag = `<script data-csranger-runtime="v22.8">\n${runtimeBridgeScript()}\n</script>`;
  const userScriptTag = userScript(javascript);

  if (looksLikeHtmlDocument(cleanedHtml)) {
    let document = cleanedHtml;
    document = insertBeforeClosingTag(document, 'head', styleTag);
    document = insertBeforeClosingTag(document, 'body', `${runtimeTag}\n${userScriptTag}`);
    return document;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${styleTag}
  </head>
  <body>
    ${cleanedHtml}
    ${runtimeTag}
    ${userScriptTag}
  </body>
</html>`;
}

function isRuntimeMessage(value: unknown): value is HtmlRuntimeMessage {
  return Boolean(value && typeof value === 'object' && (value as HtmlRuntimeMessage).source === HTML_RUNTIME_SOURCE);
}

function isSafeInternalHref(value: string) {
  return (value === '/courses' || value.startsWith('/courses/') || value.startsWith('/dashboard')) && !value.startsWith('//') && !value.includes('javascript:');
}

export function HtmlSandbox(props: HtmlSandboxProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<string | null>(null);

  const sourceDocument = useMemo(() => buildSourceDocument(props.html, props.css, props.javascript), [props.css, props.html, props.javascript]);

  useEffect(() => {
    setRuntimeError(null);
    setRuntimeStatus(null);
  }, [sourceDocument]);

  useEffect(() => {
    async function markComplete() {
      if (!props.progressEnabled || !props.courseId || !props.nodeId) {
        setRuntimeStatus('This node cannot be marked complete from the HTML runtime in the current preview.');
        return;
      }

      try {
        await apiJson(`/api/courses/${props.courseId}/nodes/${props.nodeId}/progress/complete`, {
          method: 'POST',
        });
        setRuntimeStatus('Node marked complete from the HTML runtime.');
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : 'Could not mark this node complete.');
      }
    }

    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow || !isRuntimeMessage(event.data)) {
        return;
      }

      const message = event.data;

      if (message.type === 'runtime-error') {
        setRuntimeError(message.detail ?? 'JavaScript runtime error.');
        return;
      }

      if (message.type === 'navigate-next') {
        if (props.navigation?.nextHref) {
          router.push(props.navigation.nextHref);
        } else {
          setRuntimeStatus('There is no next node from here.');
        }
        return;
      }

      if (message.type === 'navigate-previous') {
        if (props.navigation?.previousHref) {
          router.push(props.navigation.previousHref);
        } else {
          setRuntimeStatus('There is no previous node from here.');
        }
        return;
      }

      if (message.type === 'navigate-course') {
        if (props.navigation?.courseHref) {
          router.push(props.navigation.courseHref);
        }
        return;
      }

      if (message.type === 'navigate-href' && message.href) {
        if (isSafeInternalHref(message.href)) {
          router.push(message.href);
        } else {
          setRuntimeStatus('Only internal course links are allowed from HTML node scripts.');
        }
        return;
      }

      if (message.type === 'mark-complete') {
        void markComplete();
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [props.courseId, props.navigation?.courseHref, props.navigation?.nextHref, props.navigation?.previousHref, props.nodeId, props.progressEnabled, router]);

  return (
    <div className="html-sandbox-shell">
      {runtimeError ? (
        <div className="html-runtime-banner html-runtime-banner-error" role="status">
          <strong>HTML node JavaScript error</strong>
          <span>{runtimeError}</span>
        </div>
      ) : runtimeStatus ? (
        <div className="html-runtime-banner" role="status">
          <strong>HTML node runtime</strong>
          <span>{runtimeStatus}</span>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        className="html-frame"
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads"
        srcDoc={sourceDocument}
        title={props.title ?? 'HTML node preview'}
      />
    </div>
  );
}


