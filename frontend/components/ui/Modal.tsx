'use client';

import { useEffect, type PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

export function Modal(props: PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  className?: string;
}>) {
  useEffect(() => {
    if (!props.open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        props.onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props.open, props.onClose]);

  if (!props.open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={props.onClose} role="presentation">
      <div
        className={cn('modal-card', props.className)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {props.children}
      </div>
    </div>
  );
}


