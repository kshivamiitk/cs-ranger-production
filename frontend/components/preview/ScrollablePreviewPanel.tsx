'use client';

import type { CSSProperties, PropsWithChildren } from 'react';
import { useState } from 'react';
import { Expand } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { FullScreenPreviewDialog } from '@/components/preview/FullScreenPreviewDialog';

type PreviewTone = 'default' | 'document' | 'media';

interface ScrollablePreviewPanelProps extends PropsWithChildren {
  label: string;
  title?: string;
  description?: string;
  allowFullScreen?: boolean;
  fullScreenTitle?: string;
  maxHeight?: CSSProperties['maxHeight'];
  minHeight?: CSSProperties['minHeight'];
  tone?: PreviewTone;
  bodyClassName?: string;
  fullScreenBodyClassName?: string;
  className?: string;
  immersive?: boolean;
}

export function ScrollablePreviewPanel({
  allowFullScreen = true,
  bodyClassName,
  children,
  className,
  description,
  fullScreenTitle,
  fullScreenBodyClassName,
  immersive = false,
  label,
  maxHeight = 540,
  minHeight = 420,
  title,
  tone = 'default',
}: ScrollablePreviewPanelProps) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  return (
    <>
      <section
        className={cn('scrollable-preview-panel', className)}
        data-tone={tone}
        data-immersive={immersive ? 'true' : 'false'}
      >
        <div className="scrollable-preview-header">
          <div>
            <div className="section-label">{label}</div>
            {title ? <h3 className="panel-title" style={{ marginTop: 10 }}>{title}</h3> : null}
            {description ? <p className="muted" style={{ margin: title ? '8px 0 0' : '10px 0 0' }}>{description}</p> : null}
          </div>
          {allowFullScreen ? (
            <Button type="button" variant="ghost" onClick={() => setIsFullScreenOpen(true)}>
              <Expand size={16} />
              Full screen
            </Button>
          ) : null}
        </div>

        <div className={cn('scrollable-preview-body', bodyClassName)} style={{ maxHeight, minHeight }} data-tone={tone}>
          {children}
        </div>
      </section>

      {allowFullScreen ? (
        <FullScreenPreviewDialog
          open={isFullScreenOpen}
          title={fullScreenTitle ?? title ?? label}
          onClose={() => setIsFullScreenOpen(false)}
        >
          <div
            className={cn(
              'scrollable-preview-body fullscreen-preview-content-surface',
              bodyClassName,
              fullScreenBodyClassName
            )}
            data-tone={tone}
            data-immersive={immersive ? 'true' : 'false'}
          >
            {children}
          </div>
        </FullScreenPreviewDialog>
      ) : null}
    </>
  );
}


