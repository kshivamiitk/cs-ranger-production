import { z } from 'zod';

import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

const schema = z.object({
  targetAdminUserId: z.string().uuid(),
  category: z.enum(['complaint', 'suggestion']),
  subject: z.string().trim().max(160).transform((value) => (value.length === 0 ? null : value)),
  message: z.string().trim().max(4000),
  attachmentImageUrl: z.string().trim().nullable().optional(),
}).refine((value) => value.message.length >= 10 || Boolean(value.attachmentImageUrl), {
  message: 'Provide at least 10 characters or attach an image.',
  path: ['message'],
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const supabase = createServiceRoleSupabaseClient();

    const { data: adminProfile, error: adminError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', parsed.targetAdminUserId)
      .eq('is_admin', true)
      .eq('is_banned', false)
      .maybeSingle();

    if (adminError) throw adminError;
    if (!adminProfile) return failure(new Error('Selected admin was not found.'));

    const { data, error } = await supabase
      .from('admin_messages')
      .insert({
        sender_user_id: viewer.user.id,
        sender_role: viewer.profile.primaryRole,
        subject: parsed.subject,
        message: parsed.message || 'Image attachment',
        message_type: parsed.category,
        target_user_id: parsed.targetAdminUserId,
        status: 'open',
        attachment_image_url: parsed.attachmentImageUrl ?? null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return ok({ thread: { id: (data as any).id } });
  } catch (error) {
    return failure(error);
  }
}


