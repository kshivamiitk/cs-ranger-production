'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { CreatorModuleDialogBase } from '@/components/course-builder/CreatorModuleDialogBase';

export function CreatorModuleCreateDialog(props: {
  onCreate: (input: { title: string; summary: string }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add module
      </Button>

      <CreatorModuleDialogBase
        open={open}
        onOpenChange={setOpen}
        title="Create Module"
        submitLabel="Create module"
        initialTitle="New module"
        initialSummary="Module summary"
        onSubmit={props.onCreate}
      />
    </>
  );
}


