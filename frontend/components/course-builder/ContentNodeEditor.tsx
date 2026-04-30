'use client';

import type { ContentNodePayload } from '@/src/domain/models';
import { SectionedContentEditor } from '@/components/course-builder/SectionedContentEditor';

export function ContentNodeEditor(props: {
  payload: ContentNodePayload;
  onChange: (payload: ContentNodePayload) => void;
}) {
  return <SectionedContentEditor payload={props.payload} onChange={props.onChange} />;
}


