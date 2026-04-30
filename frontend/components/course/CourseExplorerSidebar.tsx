import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import type { CourseTreeModule } from '@/src/domain/models';

export function CourseExplorerSidebar(props: {
  courseId: string;
  courseTitle: string;
  modules: CourseTreeModule[];
  activeModuleId: string | null;
  activeNodeId: string | null;
}) {
  return (
    <aside className="course-explorer-sidebar fade-in-panel">
      <div className="course-explorer-header">
        <Link href={`/courses/${props.courseId}`} className="course-explorer-back-link">
          <ArrowLeft size={15} />
          Course overview
        </Link>
        <h2>{props.courseTitle}</h2>
      </div>

      <nav className="course-explorer-tree" aria-label="Course modules and nodes">
        {props.modules.length === 0 ? (
          <div className="studio-empty-state compact">No modules yet.</div>
        ) : (
          props.modules.map((module) => {
            const containsActiveNode = module.nodes.some((node) => node.id === props.activeNodeId);
            const open = props.activeModuleId === module.id || containsActiveNode;

            return (
              <details key={module.id} className="course-explorer-module" open={open}>
                <summary className="course-explorer-module-summary">{module.title}</summary>
                <div className="course-explorer-node-list">
                  {module.nodes.length === 0 ? (
                    <span className="course-explorer-empty-node">No nodes</span>
                  ) : (
                    module.nodes.map((node) => (
                      <Link
                        key={node.id}
                        href={`/courses/${props.courseId}/nodes/${node.id}`}
                        className="course-explorer-node-link"
                        data-active={props.activeNodeId === node.id}
                      >
                        {node.title}
                      </Link>
                    ))
                  )}
                </div>
              </details>
            );
          })
        )}
      </nav>
    </aside>
  );
}

