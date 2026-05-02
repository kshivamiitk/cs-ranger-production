'use client';

import type { LucideIcon } from 'lucide-react';
import { ArchiveX, BookOpen, CircleHelp, Code2, FileText, ListChecks, PlayCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { NodeType } from '@/src/domain/models';
import { getNodeTypeLabel } from '@/src/presentation/nodeMeta';

const iconByType: Record<NodeType, LucideIcon> = {
  content: BookOpen,
  question: CircleHelp,
  quiz: ListChecks,
  video: PlayCircle,
  html: Code2,
  pdf: FileText,
  github: ArchiveX,
};

export function NodeTypeBadge(props: {
  type: NodeType;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const Icon = iconByType[props.type];

  return (
    <span className={cn('node-type-badge', props.className)} data-type={props.type} data-size={props.size ?? 'md'}>
      <Icon size={props.size === 'sm' ? 14 : 16} />
      {getNodeTypeLabel(props.type)}
    </span>
  );
}

