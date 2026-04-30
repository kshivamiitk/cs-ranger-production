'use client';

import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/Button';

interface FullScreenPreviewDialogProps extends PropsWithChildren {
  open: boolean;
  title: string;
  onClose: () => void;
}

export function FullScreenPreviewDialog({ children, open, title, onClose }: FullScreenPreviewDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
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
  }, [onClose, open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fullscreen-preview-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fullscreen-preview-dialog">
        <div className="fullscreen-preview-header">
          <div>
            <div className="section-label">Full-screen preview</div>
            <h2 className="panel-title" style={{ marginTop: 10 }}>{title}</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            <X size={16} />
            Close
          </Button>
        </div>
        <div className="fullscreen-preview-body">{children}</div>
      </div>
      <button
        type="button"
        className="fullscreen-preview-dismiss"
        aria-label="Close preview"
        onClick={onClose}
      />
    </div>,
    document.body
  );
}


