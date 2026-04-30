'use client';

import { Layers3 } from 'lucide-react';

import type { ModuleWithNodes } from '@/src/domain/models';

export function CreatorModuleNavigator(props: {
  modules: ModuleWithNodes[];
  activeModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
}) {
  if (props.modules.length === 0) {
    return (
      <section className="module-navigator-panel">
        <div className="section-label">Module navigator</div>
        <div className="studio-empty-state compact">
          No modules yet. Create the first module to start structuring the course flow.
        </div>
      </section>
    );
  }

  return (
    <section className="module-navigator-panel fade-in-panel">
      <div className="course-rail-header">
        <div>
          <div className="section-label">Course modules</div>
          <h3 className="panel-title" style={{ marginTop: 10 }}>Navigator</h3>
        </div>
        <span className="studio-badge studio-badge-muted">
          <Layers3 size={14} />
          {props.modules.length} module{props.modules.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="module-navigator-list">
        {props.modules.map((module) => (
          <button
            key={module.id}
            type="button"
            className="module-navigator-item"
            data-active={props.activeModuleId === module.id}
            aria-pressed={props.activeModuleId === module.id}
            onClick={() => props.onSelectModule(module.id)}
          >
            <div className="module-navigator-leading">
              <span className="course-module-rail-index">{String(module.position).padStart(2, '0')}</span>
              <span className="studio-badge studio-badge-muted">
                {module.nodes.length} node{module.nodes.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="module-navigator-copy">
              <strong className="course-module-rail-title">{module.title}</strong>
              <p className="course-module-rail-summary">{module.summary}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}


