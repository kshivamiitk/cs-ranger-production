'use client';

import Link from 'next/link';
import { ChevronDown, ChevronUp, LayoutList, PlusCircle, Trash2 } from 'lucide-react';

import { CreatorModuleEditDialog } from '@/components/course-builder/CreatorModuleEditDialog';
import { ModuleNodeList } from '@/components/course-builder/ModuleNodeList';
import { Button } from '@/components/ui/Button';
import type { ModuleWithNodes } from '@/src/domain/models';

export function SelectedCreatorModuleWorkspace(props: {
  courseId: string;
  module: ModuleWithNodes;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdateModule: (input: { title: string; summary: string }) => Promise<void>;
  onDeleteNode: (nodeId: string) => Promise<void>;
  onMoveNode: (nodeId: string, direction: -1 | 1) => Promise<void>;
  onReorderNodes: (nodeIdsInOrder: string[]) => Promise<void>;
}) {
  const premiumNodeCount = props.module.nodes.filter((node) => node.isPremium).length;

  return (
    <section className="selected-module-workspace fade-in-panel" id={`module-${props.module.id}`}>
      <header className="selected-module-hero">
        <div className="stack" style={{ gap: 12 }}>
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-primary">Module {props.module.position}</span>
            <span className="studio-badge studio-badge-muted">
              <LayoutList size={14} />
              {props.module.nodes.length} node{props.module.nodes.length === 1 ? '' : 's'}
            </span>
            <span className="studio-badge studio-badge-muted">{premiumNodeCount} premium</span>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <div className="section-label">Selected module</div>
            <h2 className="headline selected-module-title">{props.module.title}</h2>
            <p className="subheadline selected-module-summary">{props.module.summary}</p>
          </div>
        </div>

        <div className="selected-module-actions">
          <Button type="button" variant="ghost" onClick={() => void props.onMoveUp()} disabled={props.disableMoveUp}>
            <ChevronUp size={16} />
            Move up
          </Button>
          <Button type="button" variant="ghost" onClick={() => void props.onMoveDown()} disabled={props.disableMoveDown}>
            <ChevronDown size={16} />
            Move down
          </Button>
          <CreatorModuleEditDialog module={props.module} onSave={props.onUpdateModule} />
          <Link href={`/creator/courses/${props.courseId}/modules/${props.module.id}/nodes/new`} className="button">
            <PlusCircle size={16} />
            Add node
          </Link>
          <Button type="button" variant="danger" onClick={() => void props.onDelete()}>
            <Trash2 size={16} />
            Delete module
          </Button>
        </div>
      </header>

      <section className="selected-module-node-panel stack-lg">
        <div className="stack" style={{ gap: 10 }}>
          <div className="section-label">Node list</div>
          <h3 className="panel-title">Author one node at a time</h3>
          <p className="muted" style={{ margin: 0 }}>
            This workspace now stays focused on structure, ordering, and quick routing. Click any node to open its dedicated authoring page, where preview stays isolated and easier to manage.
          </p>
        </div>

        <ModuleNodeList
          courseId={props.courseId}
          module={props.module}
          onDeleteNode={props.onDeleteNode}
          onMoveNode={props.onMoveNode}
          onReorderNodes={props.onReorderNodes}
        />
      </section>
    </section>
  );
}

