import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('textarea', props.className)} />;
}


