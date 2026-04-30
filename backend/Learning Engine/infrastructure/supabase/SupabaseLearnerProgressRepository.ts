import type { LearnerProgressRepository } from '@/src/domain/ports';
import type { Database } from '@/types/database';
import {
  mapLearnerLastVisitedNode,
  mapLearnerNodeProgress,
} from '@/src/infrastructure/supabase/mappers';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';

type LearnerNodeProgressRow = Database['public']['Tables']['learner_node_progress']['Row'];
type LearnerLastVisitedNodeRow = Database['public']['Tables']['learner_last_visited_nodes']['Row'];

export class SupabaseLearnerProgressRepository implements LearnerProgressRepository {
  constructor(
    private readonly _supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  async listNodeProgressByCourses(input: { learnerUserId: string; courseIds: string[] }) {
    if (input.courseIds.length === 0) {
      return [];
    }

    const { data, error } = await this.serviceSupabase
      .from('learner_node_progress')
      .select('*')
      .eq('learner_user_id', input.learnerUserId)
      .in('course_id', input.courseIds)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as LearnerNodeProgressRow[]).map(mapLearnerNodeProgress);
  }

  async listLastVisitedNodes(input: { learnerUserId: string; courseIds: string[] }) {
    if (input.courseIds.length === 0) {
      return [];
    }

    const { data, error } = await this.serviceSupabase
      .from('learner_last_visited_nodes')
      .select('*')
      .eq('learner_user_id', input.learnerUserId)
      .in('course_id', input.courseIds)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as LearnerLastVisitedNodeRow[]).map(mapLearnerLastVisitedNode);
  }

  async upsertNodeCompletion(input: {
    learnerUserId: string;
    courseId: string;
    moduleId: string;
    nodeId: string;
  }) {
    const { data, error } = await this.serviceSupabase
      .from('learner_node_progress')
      .upsert(
        {
          learner_user_id: input.learnerUserId,
          course_id: input.courseId,
          module_id: input.moduleId,
          node_id: input.nodeId,
          completed_at: new Date().toISOString(),
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

    return mapLearnerNodeProgress(data as LearnerNodeProgressRow);
  }

  async deleteNodeCompletion(input: { learnerUserId: string; nodeId: string }) {
    const { error } = await this.serviceSupabase
      .from('learner_node_progress')
      .delete()
      .eq('learner_user_id', input.learnerUserId)
      .eq('node_id', input.nodeId);

    if (error) {
      throw error;
    }
  }

  async upsertLastVisitedNode(input: {
    learnerUserId: string;
    courseId: string;
    moduleId: string;
    nodeId: string;
  }) {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.serviceSupabase
      .from('learner_last_visited_nodes')
      .upsert(
        {
          learner_user_id: input.learnerUserId,
          course_id: input.courseId,
          module_id: input.moduleId,
          node_id: input.nodeId,
          visited_at: nowIso,
          updated_at: nowIso,
        },
        {
          onConflict: 'learner_user_id,course_id',
        }
      )
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapLearnerLastVisitedNode(data as LearnerLastVisitedNodeRow);
  }
}

