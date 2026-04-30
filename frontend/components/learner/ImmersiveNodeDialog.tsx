'use client';

import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export function ImmersiveNodeDialog(props: PropsWithChildren<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!props.open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onClose();
      }
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('fullscreen-preview-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('fullscreen-preview-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [props.onClose, props.open]);

  if (!props.open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="immersive-node-overlay" role="dialog" aria-modal="true" aria-label={props.title}>
      <button
        type="button"
        className="immersive-node-dismiss"
        aria-label="Close immersive node mode"
        onClick={props.onClose}
      />
      <div className="immersive-node-dialog">
        <div className="immersive-node-header">
          <div className="stack" style={{ gap: 8 }}>
            <div className="section-label">Immersive node mode</div>
            <h2 className="panel-title" style={{ margin: 0 }}>{props.title}</h2>
            {props.subtitle ? <p className="muted" style={{ margin: 0 }}>{props.subtitle}</p> : null}
          </div>
          <Button type="button" variant="ghost" onClick={props.onClose}>
            <X size={16} />
            Close
          </Button>
        </div>
        <div className="immersive-node-body">{props.children}</div>
      </div>
    </div>,
    document.body
  );
}


