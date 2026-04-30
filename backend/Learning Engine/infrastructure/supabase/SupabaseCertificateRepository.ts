import crypto from 'node:crypto';

import {
  mapCourseCertificateRequirement,
  mapCourseCertificateTemplate,
  mapIssuedCertificate,
  mapIssuedCertificateAdminRow,
  mapQuizAttempt,
} from '@/src/infrastructure/supabase/mappers';
import type { CertificateRepository } from '@/src/domain/ports';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';
import type { Json } from '@/types/database';

function buildCertificateCode() {
  return `CSR-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
}

export class SupabaseCertificateRepository implements CertificateRepository {
  constructor(
    private readonly supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  async getActiveTemplate(courseId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_certificate_templates')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapCourseCertificateTemplate(data) : null;
  }

  async listTemplateRequirements(templateId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_certificate_requirements')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapCourseCertificateRequirement);
  }

  async getIssuedCertificate(input: { learnerUserId: string; courseId: string }) {
    const { data, error } = await this.serviceSupabase
      .from('issued_certificates')
      .select('*')
      .eq('learner_user_id', input.learnerUserId)
      .eq('course_id', input.courseId)
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapIssuedCertificate(data) : null;
  }

  async issueCertificate(input: {
    learnerUserId: string;
    courseId: string;
    templateId: string;
    renderPayload: Record<string, unknown>;
  }) {
    const existing = await this.getIssuedCertificate({
      learnerUserId: input.learnerUserId,
      courseId: input.courseId,
    });

    if (existing && existing.templateId === input.templateId) {
      return existing;
    }

    const { data, error } = await this.serviceSupabase
      .from('issued_certificates')
      .insert({
        learner_user_id: input.learnerUserId,
        course_id: input.courseId,
        template_id: input.templateId,
        certificate_code: buildCertificateCode(),
        render_payload: input.renderPayload as Json,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapIssuedCertificate(data);
  }

  async listLearnerQuizAttempts(input: { learnerUserId: string; courseId: string }) {
    const { data, error } = await this.serviceSupabase
      .from('quiz_attempts')
      .select('*')
      .eq('learner_user_id', input.learnerUserId)
      .eq('course_id', input.courseId)
      .order('submitted_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapQuizAttempt);
  }

  async listCourseQuizNodeIds(courseId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId);

    if (error) {
      throw error;
    }

    const moduleIds = (data ?? []).map((row) => row.id);
    if (moduleIds.length === 0) {
      return [];
    }

    const nodeResult = await this.serviceSupabase
      .from('course_nodes')
      .select('id')
      .in('module_id', moduleIds)
      .eq('type', 'quiz');

    if (nodeResult.error) {
      throw nodeResult.error;
    }

    return (nodeResult.data ?? []).map((row) => row.id);
  }

  async listCourseCertificateSummariesForCreator(creatorUserId: string) {
    const { data: courseRows, error: courseError } = await this.serviceSupabase
      .from('courses')
      .select('id, title')
      .eq('creator_user_id', creatorUserId)
      .order('updated_at', { ascending: false });

    if (courseError) {
      throw courseError;
    }

    const courseIds = (courseRows ?? []).map((row) => row.id);
    if (courseIds.length === 0) {
      return [];
    }

    const [templateResult, issuedResult] = await Promise.all([
      this.serviceSupabase
        .from('course_certificate_templates')
        .select('id, course_id, title, is_active')
        .in('course_id', courseIds),
      this.serviceSupabase
        .from('issued_certificates')
        .select('course_id')
        .in('course_id', courseIds),
    ]);

    if (templateResult.error) {
      throw templateResult.error;
    }
    if (issuedResult.error) {
      throw issuedResult.error;
    }

    const templateByCourseId = new Map<string, { id: string; title: string; is_active: boolean }>();
    for (const row of templateResult.data ?? []) {
      if (!templateByCourseId.has(row.course_id) || row.is_active) {
        templateByCourseId.set(row.course_id, row);
      }
    }

    const issuedCountByCourseId = new Map<string, number>();
    for (const row of issuedResult.data ?? []) {
      issuedCountByCourseId.set(row.course_id, (issuedCountByCourseId.get(row.course_id) ?? 0) + 1);
    }

    return (courseRows ?? []).map((courseRow) => {
      const template = templateByCourseId.get(courseRow.id);
      return {
        courseId: courseRow.id,
        courseTitle: courseRow.title,
        templateId: template?.id ?? null,
        templateTitle: template?.title ?? null,
        templateActive: template?.is_active ?? false,
        issuedCount: issuedCountByCourseId.get(courseRow.id) ?? 0,
      };
    });
  }

  async listIssuedCertificatesForAdmin() {
    const { data, error } = await this.serviceSupabase
      .from('issued_certificates')
      .select('*')
      .order('issued_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const [courseTitles, learnerNames, templateTitles] = await Promise.all([
      this.loadCourseTitles(rows.map((row) => row.course_id)),
      this.loadLearnerNames(rows.map((row) => row.learner_user_id)),
      this.loadTemplateTitles(rows.map((row) => row.template_id)),
    ]);

    return rows.map((row) =>
      mapIssuedCertificateAdminRow(row, {
        learnerName: learnerNames.get(row.learner_user_id) ?? null,
        courseTitle: courseTitles.get(row.course_id) ?? null,
        templateTitle: templateTitles.get(row.template_id) ?? null,
      })
    );
  }

  private async loadCourseTitles(courseIds: string[]) {
    const uniqueIds = [...new Set(courseIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map<string, string>();
    }

    const { data, error } = await this.serviceSupabase.from('courses').select('id, title').in('id', uniqueIds);
    if (error) {
      throw error;
    }

    return new Map((data ?? []).map((row) => [row.id, row.title]));
  }

  private async loadLearnerNames(userIds: string[]) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map<string, string | null>();
    }

    const { data, error } = await this.serviceSupabase
      .from('user_profiles')
      .select('user_id, full_name')
      .in('user_id', uniqueIds);

    if (error) {
      throw error;
    }

    return new Map((data ?? []).map((row) => [row.user_id, row.full_name]));
  }

  private async loadTemplateTitles(templateIds: string[]) {
    const uniqueIds = [...new Set(templateIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map<string, string>();
    }

    const { data, error } = await this.serviceSupabase
      .from('course_certificate_templates')
      .select('id, title')
      .in('id', uniqueIds);

    if (error) {
      throw error;
    }

    return new Map((data ?? []).map((row) => [row.id, row.title]));
  }
}


