'use client';

import { useState } from 'react';
import { PencilLine } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { ModuleWithNodes } from '@/src/domain/models';
import { CreatorModuleDialogBase } from '@/components/course-builder/CreatorModuleDialogBase';

export function CreatorModuleEditDialog(props: {
  module: ModuleWithNodes;
  onSave: (input: { title: string; summary: string }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <PencilLine size={16} />
        Edit
      </Button>

      <CreatorModuleDialogBase
        open={open}
        onOpenChange={setOpen}
        title="Edit Module"
        submitLabel="Save module"
        initialTitle={props.module.title}
        initialSummary={props.module.summary}
        onSubmit={props.onSave}
      />
    </>
  );
}


