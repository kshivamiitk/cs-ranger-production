import { z } from 'zod';

import { ok, failure } from '@/src/presentation/http/routeUtils';
import { ApplicationError } from '@/src/application/errors';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

const schema = z.object({
  body: z.string().trim().max(4000).default(''),
  attachmentImageUrl: z.string().trim().nullable().optional(),
}).refine((value) => value.body.length >= 2 || Boolean(value.attachmentImageUrl), {
  message: 'Reply must contain text or an image.',
  path: ['body'],
});

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await context.params;
    const parsed = schema.parse(await request.json());
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const supabase = createServiceRoleSupabaseClient();

    const { data: thread, error: threadError } = await supabase
      .from('admin_messages')
      .select('id, sender_user_id, target_user_id, status')
      .eq('id', threadId)
      .maybeSingle();

    if (threadError) throw threadError;
    if (!thread) throw new Error('Support thread not found.');

    const isParticipant = thread.sender_user_id === viewer.user.id || thread.target_user_id === viewer.user.id;
    if (!isParticipant) throw new ApplicationError('You cannot reply to this thread.', 403);

    const { error } = await supabase
      .from('admin_message_replies')
      .insert({ thread_id: threadId, sender_user_id: viewer.user.id, body: parsed.body || 'Image attachment', attachment_image_url: parsed.attachmentImageUrl ?? null });
    if (error) throw error;

    const { error: updateError } = await supabase
      .from('admin_messages')
      .update({ updated_at: new Date().toISOString(), status: thread.status === 'closed' ? 'open' : thread.status })
      .eq('id', threadId);
    if (updateError) throw updateError;

    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}


