import { z } from 'zod';

import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { ok, failure } from '@/src/presentation/http/routeUtils';

const certificateSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).nullable().optional(),
  logoUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
  accentColor: z.string().trim().max(30).nullable().optional(),
  signatureName: z.string().trim().max(120).nullable().optional(),
  signatureTitle: z.string().trim().max(120).nullable().optional(),
  bodyTemplate: z.string().trim().min(1).max(500).default('This is to certify that {{learnerName}} has successfully completed the course {{courseTitle}}.'),
  requireAllQuizAttempts: z.boolean().default(true),
  minimumAveragePercent: z.coerce.number().min(0).max(100).default(60),
});

async function requireOwnedCourse(courseId: string, creatorUserId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, creator_user_id')
    .eq('id', courseId)
    .eq('creator_user_id', creatorUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Course not found or not owned by the active creator.');

  return { supabase, course: data };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { authService } = await createServerContainer();
    const viewer = await authService.requireViewer();
    const { supabase, course } = await requireOwnedCourse(courseId, viewer.user.id);

    const [{ data: template, error: templateError }, { data: modules, error: moduleError }] = await Promise.all([
      supabase
        .from('course_certificate_templates')
        .select('*')
        .eq('course_id', courseId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('course_modules').select('id').eq('course_id', courseId),
    ]);

    if (templateError) throw templateError;
    if (moduleError) throw moduleError;

    const moduleIds = (modules ?? []).map((entry) => entry.id);
    const [{ data: requirements, error: requirementsError }, { data: quizNodes, error: nodeError }] = await Promise.all([
      template
        ? supabase
            .from('course_certificate_requirements')
            .select('*')
            .eq('template_id', template.id)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      moduleIds.length > 0
        ? supabase
            .from('course_nodes')
            .select('id, title, position, module_id')
            .in('module_id', moduleIds)
            .eq('type', 'quiz')
            .order('position', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (requirementsError) throw requirementsError;
    if (nodeError) throw nodeError;

    const config = (template?.template_config as Record<string, unknown> | null) ?? {};
    const settings = {
      enabled: template?.is_active ?? false,
      title: template?.title ?? `${course.title} Certificate of Completion`,
      description: template?.description ?? '',
      logoUrl: typeof config.logoUrl === 'string' ? config.logoUrl : '',
      accentColor: typeof config.accentColor === 'string' ? config.accentColor : '#f97316',
      signatureName: typeof config.signatureName === 'string' ? config.signatureName : '',
      signatureTitle: typeof config.signatureTitle === 'string' ? config.signatureTitle : 'Course Creator',
      bodyTemplate:
        typeof config.bodyTemplate === 'string'
          ? config.bodyTemplate
          : 'This is to certify that {{learnerName}} has successfully completed the course {{courseTitle}}.',
      requireAllQuizAttempts: (requirements ?? []).some((entry) => entry.requirement_type === 'all_quiz_nodes_attempted'),
      minimumAveragePercent: Number(
        ((requirements ?? []).find((entry) => entry.requirement_type === 'course_quiz_average_min_score')?.requirement_value as { minimumPercent?: number } | undefined)?.minimumPercent ?? 60
      ),
    };

    return ok({ settings, quizNodes: quizNodes ?? [], templateId: template?.id ?? null });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const parsed = certificateSettingsSchema.parse(await request.json());
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const { supabase } = await requireOwnedCourse(courseId, viewer.user.id);

    const { data: existing, error: existingError } = await supabase
      .from('course_certificate_templates')
      .select('id')
      .eq('course_id', courseId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    const templatePayload = {
      course_id: courseId,
      title: parsed.title,
      description: parsed.description ?? null,
      is_active: parsed.enabled,
      template_config: {
        logoUrl: typeof parsed.logoUrl === 'string' ? parsed.logoUrl : null,
        accentColor: parsed.accentColor ?? '#f97316',
        signatureName: parsed.signatureName ?? null,
        signatureTitle: parsed.signatureTitle ?? null,
        bodyTemplate: parsed.bodyTemplate,
      },
    };

    const templateResult = existing
      ? await supabase.from('course_certificate_templates').update(templatePayload).eq('id', existing.id).select('*').single()
      : await supabase.from('course_certificate_templates').insert(templatePayload).select('*').single();

    if (templateResult.error) throw templateResult.error;

    const templateId = templateResult.data.id;
    const { error: deleteError } = await supabase
      .from('course_certificate_requirements')
      .delete()
      .eq('template_id', templateId);

    if (deleteError) throw deleteError;

    const requirements = [] as Array<{ template_id: string; requirement_type: string; requirement_value: Record<string, unknown> }>;

    if (parsed.requireAllQuizAttempts) {
      requirements.push({
        template_id: templateId,
        requirement_type: 'all_quiz_nodes_attempted',
        requirement_value: {},
      });
    }

    if (parsed.minimumAveragePercent > 0) {
      requirements.push({
        template_id: templateId,
        requirement_type: 'course_quiz_average_min_score',
        requirement_value: { minimumPercent: parsed.minimumAveragePercent },
      });
    }

    if (requirements.length > 0) {
      const { error: insertError } = await supabase
        .from('course_certificate_requirements')
        .insert(requirements as any);

      if (insertError) throw insertError;
    }

    return ok({ template: templateResult.data });
  } catch (error) {
    return failure(error);
  }
}

