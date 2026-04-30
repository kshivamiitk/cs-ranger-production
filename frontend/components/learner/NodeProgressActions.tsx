'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

import { apiJson } from '@/src/presentation/http/client';
import { cn } from '@/lib/utils';

export function NodeProgressActions(props: {
  courseId: string;
  nodeId: string;
  initialCompleted: boolean;
  enabled: boolean;
  unavailableLabel?: string;
}) {
  const [completed, setCompleted] = useState(props.initialCompleted);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const trackedVisitKeyRef = useRef<string | null>(null);
  const activeMutationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    activeMutationKeyRef.current = null;
    setCompleted(props.initialCompleted);
    setErrorMessage(null);
    setPending(false);
  }, [props.courseId, props.initialCompleted, props.nodeId]);

  useEffect(() => {
    if (!props.enabled) {
      return;
    }

    const visitKey = `${props.courseId}:${props.nodeId}`;
    if (trackedVisitKeyRef.current === visitKey) {
      return;
    }

    trackedVisitKeyRef.current = visitKey;
    void apiJson(`/api/courses/${props.courseId}/nodes/${props.nodeId}/progress/visit`, {
      method: 'POST',
    }).catch(() => undefined);
  }, [props.courseId, props.enabled, props.nodeId]);

  const statusMessage = !props.enabled
    ? props.unavailableLabel ?? 'Sign in as a learner to track completion.'
    : completed
      ? 'Saved to your course progress.'
      : 'Use this when you finish the node.';

  return (
    <div className="node-progress-control" data-completed={completed} data-disabled={!props.enabled}>
      <button
        type="button"
        className={cn(
          'button node-progress-button',
          completed ? 'is-complete' : 'is-incomplete',
          !props.enabled ? 'is-unavailable' : undefined
        )}
        disabled={!props.enabled || pending}
        aria-pressed={completed}
        title={
          !props.enabled
            ? statusMessage
            : completed
              ? 'Click to mark this node incomplete.'
              : 'Click when you finish this node.'
        }
        onClick={() => {
          if (!props.enabled || pending) {
            return;
          }

          const nextCompleted = !completed;
          const mutationKey = `${props.courseId}:${props.nodeId}`;
          activeMutationKeyRef.current = mutationKey;
          setCompleted(nextCompleted);
          setErrorMessage(null);
          setPending(true);

          void apiJson(`/api/courses/${props.courseId}/nodes/${props.nodeId}/progress/complete`, {
            method: nextCompleted ? 'POST' : 'DELETE',
          })
            .catch((error) => {
              if (activeMutationKeyRef.current !== mutationKey) {
                return;
              }

              setCompleted(completed);
              setErrorMessage(error instanceof Error ? error.message : 'Could not update completion.');
            })
            .finally(() => {
              if (activeMutationKeyRef.current !== mutationKey) {
                return;
              }

              activeMutationKeyRef.current = null;
              setPending(false);
            });
        }}
      >
        {pending ? (
          <Loader2 className="node-progress-spinner" size={16} />
        ) : completed ? (
          <CheckCircle2 size={16} />
        ) : (
          <Circle size={16} />
        )}
        {pending ? 'Updating…' : completed ? 'Completed' : 'Mark node complete'}
      </button>
      <p className={cn('node-progress-feedback', errorMessage ? 'is-error' : undefined)} role="status" aria-live="polite">
        {errorMessage ?? statusMessage}
      </p>
    </div>
  );
}
