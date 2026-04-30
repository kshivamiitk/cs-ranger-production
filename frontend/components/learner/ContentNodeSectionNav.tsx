'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  contentNodeSections,
  getContentSectionByKey,
  type ContentSectionKey,
} from '@/src/domain/contentSections';

function sectionHref(courseId: string, nodeId: string, sectionSlug: string) {
  return `/courses/${courseId}/nodes/${nodeId}?section=${sectionSlug}`;
}

export function ContentNodeSectionNav(props: {
  courseId: string;
  nodeId: string;
  activeSectionKey: ContentSectionKey;
}) {
  const activeIndex = contentNodeSections.findIndex((section) => section.key === props.activeSectionKey);
  const activeSection = getContentSectionByKey(props.activeSectionKey);
  const previousSection = activeIndex > 0 ? contentNodeSections[activeIndex - 1] : null;
  const nextSection = activeIndex >= 0 && activeIndex < contentNodeSections.length - 1
    ? contentNodeSections[activeIndex + 1]
    : null;

  return (
    <div className="stack content-node-reader-nav" style={{ gap: 10 }}>
      <div className="segmented-control content-node-reader-tabs" role="tablist" aria-label="Content node pages">
        {contentNodeSections.map((section) => {
          const isActive = section.key === props.activeSectionKey;

          return (
            <Link
              key={section.key}
              href={sectionHref(props.courseId, props.nodeId, section.slug)}
              className={cn('segmented-control-button content-node-reader-tab', isActive ? 'is-active' : undefined)}
              data-active={isActive}
              aria-current={isActive ? 'page' : undefined}
            >
              {section.shortLabel}
            </Link>
          );
        })}
      </div>

      <div className="inline content-node-reader-nav-actions">
        <span className="studio-badge studio-badge-muted">{activeSection.label}</span>
        <div className="inline content-node-reader-nav-buttons">
          {previousSection ? (
            <Link
              href={sectionHref(props.courseId, props.nodeId, previousSection.slug)}
              className="button button-ghost"
            >
              <ChevronLeft size={16} />
              Previous page
            </Link>
          ) : null}
          {nextSection ? (
            <Link
              href={sectionHref(props.courseId, props.nodeId, nextSection.slug)}
              className="button button-secondary"
            >
              Next page
              <ChevronRight size={16} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}


