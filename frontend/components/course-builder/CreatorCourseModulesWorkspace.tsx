'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CourseDetail, ModuleWithNodes } from '@/src/domain/models';
import { CreatorCourseHero } from '@/components/course-builder/CreatorCourseHero';
import { CreatorModuleCreateDialog } from '@/components/course-builder/CreatorModuleCreateDialog';
import { CreatorModuleNavigator } from '@/components/course-builder/CreatorModuleNavigator';
import { SelectedCreatorModuleWorkspace } from '@/components/course-builder/SelectedCreatorModuleWorkspace';
import { apiJson } from '@/src/presentation/http/client';

export function CreatorCourseModulesWorkspace(props: {
  initialCourse: CourseDetail;
}) {
  const [course, setCourse] = useState(props.initialCourse);
  const [error, setError] = useState<string | null>(null);
  const orderedModules = useMemo(
    () => [...course.modules].sort((left, right) => left.position - right.position),
    [course.modules]
  );
  const [activeModuleId, setActiveModuleId] = useState<string | null>(orderedModules[0]?.id ?? null);

  useEffect(() => {
    if (!orderedModules.length) {
      setActiveModuleId(null);
      return;
    }

    if (!activeModuleId || !orderedModules.some((module) => module.id === activeModuleId)) {
      setActiveModuleId(orderedModules[0]?.id ?? null);
    }
  }, [activeModuleId, orderedModules]);

  const activeModule = orderedModules.find((module) => module.id === activeModuleId) ?? orderedModules[0] ?? null;
  const activeModuleIndex = activeModule ? orderedModules.findIndex((module) => module.id === activeModule.id) : -1;

  async function createModule(input: { title: string; summary: string }) {
    const response = await apiJson<{ module: ModuleWithNodes }>(`/api/creator/courses/${course.id}/modules`, {
      method: 'POST',
      body: JSON.stringify(input),
    });

    setCourse((current) => ({
      ...current,
      modules: [...current.modules, response.module].sort((left, right) => left.position - right.position),
    }));
    setActiveModuleId(response.module.id);
  }

  async function updateModule(moduleId: string, input: { title: string; summary: string }) {
    await apiJson(`/api/creator/modules/${moduleId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        courseId: course.id,
        ...input,
      }),
    });

    setCourse((current) => ({
      ...current,
      modules: current.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              title: input.title,
              summary: input.summary,
            }
          : module
      ),
    }));
  }

  async function deleteModule(moduleId: string) {
    if (!window.confirm('Delete this module and all of its nodes?')) {
      return;
    }

    await apiJson(`/api/creator/modules/${moduleId}?courseId=${course.id}`, {
      method: 'DELETE',
    });

    setCourse((current) => ({
      ...current,
      modules: reindexPositions(current.modules.filter((module) => module.id !== moduleId)),
    }));
    setActiveModuleId((current) => (current === moduleId ? null : current));
  }

  async function moveModule(moduleId: string, direction: -1 | 1) {
    const previousModules = [...course.modules].sort((left, right) => left.position - right.position);
    const moduleIndex = previousModules.findIndex((module) => module.id === moduleId);
    const nextIndex = moduleIndex + direction;

    if (moduleIndex < 0 || nextIndex < 0 || nextIndex >= previousModules.length) {
      return;
    }

    const nextModules = reindexPositions(moveItem(previousModules, moduleIndex, nextIndex));
    setCourse((current) => ({ ...current, modules: nextModules }));

    try {
      await apiJson(`/api/creator/courses/${course.id}/modules/reorder`, {
        method: 'POST',
        body: JSON.stringify({ ids: nextModules.map((module) => module.id) }),
      });
    } catch (caught) {
      setCourse((current) => ({ ...current, modules: previousModules }));
      throw caught;
    }
  }

  async function deleteNode(moduleId: string, nodeId: string) {
    await apiJson(`/api/creator/nodes/${nodeId}?courseId=${course.id}&moduleId=${moduleId}`, {
      method: 'DELETE',
    });

    setCourse((current) => ({
      ...current,
      modules: current.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              nodes: reindexPositions(module.nodes.filter((node) => node.id !== nodeId)),
            }
          : module
      ),
    }));
  }

  async function moveNode(moduleId: string, nodeId: string, direction: -1 | 1) {
    const targetModule = course.modules.find((module) => module.id === moduleId);
    if (!targetModule) {
      return;
    }

    const previousNodes = [...targetModule.nodes].sort((left, right) => left.position - right.position);
    const nodeIndex = previousNodes.findIndex((node) => node.id === nodeId);
    const nextIndex = nodeIndex + direction;

    if (nodeIndex < 0 || nextIndex < 0 || nextIndex >= previousNodes.length) {
      return;
    }

    const nextNodes = reindexPositions(moveItem(previousNodes, nodeIndex, nextIndex));
    setCourse((current) => ({
      ...current,
      modules: current.modules.map((module) =>
        module.id === moduleId ? { ...module, nodes: nextNodes } : module
      ),
    }));

    try {
      await apiJson(`/api/creator/modules/${moduleId}/nodes/reorder`, {
        method: 'POST',
        body: JSON.stringify({
          courseId: course.id,
          ids: nextNodes.map((node) => node.id),
        }),
      });
    } catch (caught) {
      setCourse((current) => ({
        ...current,
        modules: current.modules.map((module) =>
          module.id === moduleId ? { ...module, nodes: previousNodes } : module
        ),
      }));
      throw caught;
    }
  }

  async function reorderNodes(moduleId: string, nodeIdsInOrder: string[]) {
    const targetModule = course.modules.find((module) => module.id === moduleId);
    if (!targetModule) {
      return;
    }

    const previousNodes = [...targetModule.nodes].sort((left, right) => left.position - right.position);
    const nodesById = new Map(previousNodes.map((node) => [node.id, node]));

    if (
      nodeIdsInOrder.length !== previousNodes.length ||
      nodeIdsInOrder.some((nodeId) => !nodesById.has(nodeId))
    ) {
      return;
    }

    if (previousNodes.every((node, index) => node.id === nodeIdsInOrder[index])) {
      return;
    }

    const nextNodes = reindexPositions(nodeIdsInOrder.map((nodeId) => nodesById.get(nodeId)!));
    setCourse((current) => ({
      ...current,
      modules: current.modules.map((module) =>
        module.id === moduleId ? { ...module, nodes: nextNodes } : module
      ),
    }));

    try {
      await apiJson(`/api/creator/modules/${moduleId}/nodes/reorder`, {
        method: 'POST',
        body: JSON.stringify({
          courseId: course.id,
          ids: nextNodes.map((node) => node.id),
        }),
      });
    } catch (caught) {
      setCourse((current) => ({
        ...current,
        modules: current.modules.map((module) =>
          module.id === moduleId ? { ...module, nodes: previousNodes } : module
        ),
      }));
      throw caught;
    }
  }

  async function runAction(action: () => Promise<void>) {
    setError(null);

    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Creator workspace action failed.');
    }
  }

  return (
    <div className="stack-lg">
      <CreatorCourseHero
        course={course}
        backHref="/creator/courses"
        backLabel="Back to courses"
        actions={<CreatorModuleCreateDialog onCreate={(input) => runAction(() => createModule(input))} />}
      />

      {error ? <div className="studio-inline-alert">{error}</div> : null}

      <section className="stack-lg">
        <div className="stack creator-structure-heading">
          <div className="section-label">Modules</div>
          <h3 className="panel-title creator-structure-title">Course structure</h3>
          <p className="muted flush">
            Navigate modules from the left rail, keep one module active at a time, and use dedicated node routes for focused authoring.
          </p>
        </div>

        <div className="creator-modules-layout">
          <aside className="creator-module-rail">
            <CreatorModuleNavigator
              modules={orderedModules}
              activeModuleId={activeModule?.id ?? null}
              onSelectModule={setActiveModuleId}
            />
          </aside>

          <div className="creator-module-stage">
            {activeModule ? (
              <SelectedCreatorModuleWorkspace
                courseId={course.id}
                module={activeModule}
                disableMoveUp={activeModuleIndex <= 0}
                disableMoveDown={activeModuleIndex === orderedModules.length - 1}
                onMoveUp={() => runAction(() => moveModule(activeModule.id, -1))}
                onMoveDown={() => runAction(() => moveModule(activeModule.id, 1))}
                onDelete={() => runAction(() => deleteModule(activeModule.id))}
                onUpdateModule={(input) => runAction(() => updateModule(activeModule.id, input))}
                onDeleteNode={(nodeId) => runAction(() => deleteNode(activeModule.id, nodeId))}
                onMoveNode={(nodeId, direction) => runAction(() => moveNode(activeModule.id, nodeId, direction))}
                onReorderNodes={(nodeIdsInOrder) => runAction(() => reorderNodes(activeModule.id, nodeIdsInOrder))}
              />
            ) : (
              <section className="studio-empty-state">
                <div className="stack stack-tight">
                  <h3 className="panel-title">No active module selected</h3>
                  <p className="muted flush">
                    Create a module to open its node workspace here.
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

function reindexPositions<T extends { position: number }>(items: T[]) {
  return [...items]
    .sort((left, right) => left.position - right.position)
    .map((item, index) => ({
      ...item,
      position: index + 1,
    }));
}
