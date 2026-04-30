import type { NodeBookmarkRepository } from '@/src/domain/ports';
import type { Database } from '@/types/database';
import { mapNodeBookmarkEntry } from '@/src/infrastructure/supabase/mappers';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';

type NodeBookmarkEntryRow = Database['public']['Tables']['node_bookmark_entries']['Row'];

export class SupabaseNodeBookmarkRepository implements NodeBookmarkRepository {
  constructor(
    private readonly _supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  async listBookmarksByLearner(learnerUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('node_bookmark_entries')
      .select('*')
      .eq('learner_user_id', learnerUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as NodeBookmarkEntryRow[]).map(mapNodeBookmarkEntry);
  }

  async listBookmarkedNodeIds(input: { learnerUserId: string; nodeIds: string[] }) {
    if (input.nodeIds.length === 0) {
      return [];
    }

    const { data, error } = await this.serviceSupabase
      .from('node_bookmark_entries')
      .select('node_id')
      .eq('learner_user_id', input.learnerUserId)
      .in('node_id', input.nodeIds);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => row.node_id);
  }

  async addBookmark(input: {
    learnerUserId: string;
    courseId: string;
    moduleId: string;
    nodeId: string;
  }) {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.serviceSupabase
      .from('node_bookmark_entries')
      .upsert(
        {
          learner_user_id: input.learnerUserId,
          course_id: input.courseId,
          module_id: input.moduleId,
          node_id: input.nodeId,
          updated_at: nowIso,
        },
        {
          onConflict: 'learner_user_id,node_id',
        }
      )
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapNodeBookmarkEntry(data as NodeBookmarkEntryRow);
  }

  async removeBookmark(input: { learnerUserId: string; nodeId: string }) {
    const { error } = await this.serviceSupabase
      .from('node_bookmark_entries')
      .delete()
      .eq('learner_user_id', input.learnerUserId)
      .eq('node_id', input.nodeId);

    if (error) {
      throw error;
    }
  }
}


