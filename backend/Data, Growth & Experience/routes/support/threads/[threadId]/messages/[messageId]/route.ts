import { z } from 'zod';

import { ok, failure } from '@/src/presentation/http/routeUtils';
import { ApplicationError } from '@/src/application/errors';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

const patchSchema = z.object({
  body: z.string().trim().max(4000).default(''),
  attachmentImageUrl: z.string().trim().nullable().optional(),
}).refine((value) => value.body.length >= 2 || Boolean(value.attachmentImageUrl), {
  message: 'Message must contain text or an image.',
  path: ['body'],
});

export async function PATCH(request: Request, context: { params: Promise<{ threadId: string; messageId: string }> }) {
  try {
    const { threadId, messageId } = await context.params;
    const parsed = patchSchema.parse(await request.json());
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
    if (!isParticipant) throw new ApplicationError('You cannot edit this thread.', 403);
    if (thread.status === 'closed') throw new ApplicationError('Closed threads cannot be edited.', 400);

    const editedAt = new Date().toISOString();

    if (messageId === threadId) {
      if (thread.sender_user_id !== viewer.user.id) {
        throw new ApplicationError('Only the original sender can edit this message.', 403);
      }

      const { error } = await supabase
        .from('admin_messages')
        .update({
          message: parsed.body || 'Image attachment',
          attachment_image_url: parsed.attachmentImageUrl ?? null,
          edited_at: editedAt,
          updated_at: editedAt,
          is_deleted: false,
          deleted_at: null,
        })
        .eq('id', threadId);

      if (error) throw error;
      return ok({ success: true });
    }

    const { data: reply, error: replyError } = await supabase
      .from('admin_message_replies')
      .select('id, sender_user_id')
      .eq('id', messageId)
      .eq('thread_id', threadId)
      .maybeSingle();

    if (replyError) throw replyError;
    if (!reply) throw new Error('Support message not found.');
    if (reply.sender_user_id !== viewer.user.id) {
      throw new ApplicationError('Only the sender can edit this reply.', 403);
    }

    const { error } = await supabase
      .from('admin_message_replies')
      .update({
        body: parsed.body || 'Image attachment',
        attachment_image_url: parsed.attachmentImageUrl ?? null,
        edited_at: editedAt,
        is_deleted: false,
        deleted_at: null,
      })
      .eq('id', messageId)
      .eq('thread_id', threadId);

    if (error) throw error;

    await supabase
      .from('admin_messages')
      .update({ updated_at: editedAt })
      .eq('id', threadId);

    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ threadId: string; messageId: string }> }) {
  try {
    const { threadId, messageId } = await context.params;
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
    if (!isParticipant) throw new ApplicationError('You cannot delete messages in this thread.', 403);

    const deletedAt = new Date().toISOString();

    if (messageId === threadId) {
      const canDelete = thread.sender_user_id === viewer.user.id || (viewer.profile.isAdmin && thread.target_user_id === viewer.user.id);
      if (!canDelete) throw new ApplicationError('You cannot delete this message.', 403);

      const { error } = await supabase
        .from('admin_messages')
        .update({
          message: 'This message was deleted.',
          attachment_image_url: null,
          is_deleted: true,
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .eq('id', threadId);

      if (error) throw error;
      return ok({ success: true });
    }

    const { data: reply, error: replyError } = await supabase
      .from('admin_message_replies')
      .select('id, sender_user_id')
      .eq('id', messageId)
      .eq('thread_id', threadId)
      .maybeSingle();

    if (replyError) throw replyError;
    if (!reply) throw new Error('Support message not found.');

    const canDelete = reply.sender_user_id === viewer.user.id || (viewer.profile.isAdmin && thread.target_user_id === viewer.user.id);
    if (!canDelete) throw new ApplicationError('You cannot delete this reply.', 403);

    const { error } = await supabase
      .from('admin_message_replies')
      .update({
        body: 'This message was deleted.',
        attachment_image_url: null,
        is_deleted: true,
        deleted_at: deletedAt,
      })
      .eq('id', messageId)
      .eq('thread_id', threadId);

    if (error) throw error;

    await supabase
      .from('admin_messages')
      .update({ updated_at: deletedAt })
      .eq('id', threadId);

    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}


