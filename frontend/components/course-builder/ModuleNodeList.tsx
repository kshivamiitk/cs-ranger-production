'use client';

import { useMemo, useState } from 'react';

import type { ModuleWithNodes } from '@/src/domain/models';
import { ModuleNodeListItem } from '@/components/course-builder/ModuleNodeListItem';

export function ModuleNodeList(props: {
  courseId: string;
  module: ModuleWithNodes;
  onDeleteNode: (nodeId: string) => Promise<void>;
  onMoveNode: (nodeId: string, direction: -1 | 1) => Promise<void>;
  onReorderNodes: (nodeIdsInOrder: string[]) => Promise<void>;
}) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetNodeId, setDropTargetNodeId] = useState<string | null>(null);
  const nodes = useMemo(
    () => [...props.module.nodes].sort((left, right) => left.position - right.position),
    [props.module.nodes]
  );

  async function dropNodeOnTarget(targetNodeId: string) {
    if (!draggedNodeId || draggedNodeId === targetNodeId) {
      setDraggedNodeId(null);
      setDropTargetNodeId(null);
      return;
    }

    const sourceIndex = nodes.findIndex((node) => node.id === draggedNodeId);
    const targetIndex = nodes.findIndex((node) => node.id === targetNodeId);

    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedNodeId(null);
      setDropTargetNodeId(null);
      return;
    }

    const nextNodes = [...nodes];
    const draggedNode = nextNodes.splice(sourceIndex, 1)[0];
    if (!draggedNode) {
      setDraggedNodeId(null);
      setDropTargetNodeId(null);
      return;
    }

    nextNodes.splice(targetIndex, 0, draggedNode);
    setDraggedNodeId(null);
    setDropTargetNodeId(null);

    await props.onReorderNodes(nextNodes.map((node) => node.id));
  }

  if (nodes.length === 0) {
    return <div className="empty-state">No nodes yet. Use &quot;Add node&quot; to open the dedicated node authoring page.</div>;
  }

  return (
    <div className="module-node-drag-list" aria-label="Drag nodes to reorder them">
      {nodes.map((node, index) => (
        <ModuleNodeListItem
          key={node.id}
          courseId={props.courseId}
          moduleId={props.module.id}
          node={node}
          disableMoveUp={index === 0}
          disableMoveDown={index === nodes.length - 1}
          dragging={draggedNodeId === node.id}
          dropTarget={dropTargetNodeId === node.id && draggedNodeId !== node.id}
          onDelete={async () => {
            if (!window.confirm('Remove this node from the module?')) {
              return;
            }

            await props.onDeleteNode(node.id);
          }}
          onMoveUp={() => props.onMoveNode(node.id, -1)}
          onMoveDown={() => props.onMoveNode(node.id, 1)}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', node.id);
            setDraggedNodeId(node.id);
          }}
          onDragOver={(event) => {
            if (!draggedNodeId || draggedNodeId === node.id) {
              return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDropTargetNodeId(node.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            void dropNodeOnTarget(node.id);
          }}
          onDragEnd={() => {
            setDraggedNodeId(null);
            setDropTargetNodeId(null);
          }}
        />
      ))}
    </div>
  );
}
