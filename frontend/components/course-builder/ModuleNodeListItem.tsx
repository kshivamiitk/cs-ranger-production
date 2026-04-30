'use client';

import type { DragEvent } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, PencilLine, Trash2 } from 'lucide-react';

import type { CourseNode } from '@/src/domain/models';
import { Button } from '@/components/ui/Button';
import { getNodeSummary } from '@/src/presentation/nodeMeta';

export function ModuleNodeListItem(props: {
  courseId: string;
  moduleId: string;
  node: CourseNode;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onDelete: () => Promise<void>;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const editHref = `/creator/courses/${props.courseId}/modules/${props.moduleId}/nodes/${props.node.id}/edit`;

  return (
    <article
      className="studio-node-row premium-list-row"
      data-dragging={props.dragging}
      data-drop-target={props.dropTarget}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
    >
      <button
        type="button"
        className="node-drag-handle"
        draggable
        aria-label={`Drag ${props.node.title} to reorder`}
        onDragStart={props.onDragStart}
        onDragEnd={props.onDragEnd}
      >
        <GripVertical size={18} />
      </button>

      <div className="node-list-copy">
        <div className="inline premium-badge-row" style={{ marginBottom: 8 }}>
          <span className="studio-badge studio-badge-muted">{props.node.type}</span>
          <span className="studio-badge studio-badge-muted">Position {props.node.position}</span>
          <span className={`studio-badge ${props.node.isPremium ? 'studio-badge-primary' : 'studio-badge-success'}`}>
            {props.node.isPremium ? 'Premium' : 'Free'}
          </span>
        </div>
        <Link href={editHref} className="panel-title" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', textDecoration: 'none' }}>
          <span>{props.node.title}</span>
          <ExternalLink size={14} />
        </Link>
        <p className="muted" style={{ margin: '8px 0 0' }}>{getNodeSummary(props.node)}</p>
      </div>

      <div className="node-list-actions">
        <Link href={editHref} className="button button-secondary">
          <PencilLine size={16} />
          Open
        </Link>
        <Button type="button" variant="ghost" onClick={() => void props.onMoveUp()} disabled={props.disableMoveUp}>
          <ArrowUp size={16} />
          Move up
        </Button>
        <Button type="button" variant="ghost" onClick={() => void props.onMoveDown()} disabled={props.disableMoveDown}>
          <ArrowDown size={16} />
          Move down
        </Button>
        <Button type="button" variant="danger" onClick={() => void props.onDelete()}>
          <Trash2 size={16} />
          Delete
        </Button>
      </div>
    </article>
  );
}

