import { z } from 'zod';

import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

const schema = z.object({ status: z.enum(['open', 'resolved', 'closed']) });

export async function PATCH(request: Request, context: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await context.params;
    const parsed = schema.parse(await request.json());
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const supabase = createServiceRoleSupabaseClient();

    const { error } = await supabase
      .from('admin_messages')
      .update({ status: parsed.status, reviewed_by_admin_user_id: viewer.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', threadId)
      .eq('target_user_id', viewer.user.id);
    if (error) throw error;

    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}


