import {
  mapCourse,
  mapCourseDetail,
  mapCourseNode,
  mapCourseOverview,
  mapCourseTreeDetail,
  mapCourseModule,
  mapQuizAttempt,
} from '@/src/infrastructure/supabase/mappers';
import type { CourseRepository } from '@/src/domain/ports';
import type { CourseNode, CourseOverview } from '@/src/domain/models';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';
import type { Database } from '@/types/database';
import { slugify } from '@/lib/utils';

type CourseRow = Database['public']['Tables']['courses']['Row'];
type ModuleRow = Database['public']['Tables']['course_modules']['Row'];
type NodeRow = Database['public']['Tables']['course_nodes']['Row'];

type CourseOverviewReadModelRow = CourseRow & {
  creator_name: string | null;
  creator_username: string | null;
  domain_name: string | null;
  domain_slug: string | null;
  module_count: number | string | null;
  node_count: number | string | null;
  premium_node_count: number | string | null;
  wishlist_count: number | string | null;
  average_rating: number | string | null;
  total_reviews: number | string | null;
  active_learner_count: number | string | null;
};

function toInt(value: number | string | null | undefined) {
  return Number.parseInt(String(value ?? 0), 10) || 0;
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0;
}

function mapCourseOverviewReadModel(row: CourseOverviewReadModelRow): CourseOverview {
  return mapCourseOverview(row, {
    creatorName: row.creator_name ?? null,
    creatorUsername: row.creator_username ?? null,
    domainName: row.domain_name ?? null,
    domainSlug: row.domain_slug ?? null,
    moduleCount: toInt(row.module_count),
    nodeCount: toInt(row.node_count),
    premiumNodeCount: toInt(row.premium_node_count),
    wishlistCount: toInt(row.wishlist_count),
    averageRating: Number(toNumber(row.average_rating).toFixed(2)),
    totalReviews: toInt(row.total_reviews),
    activeLearnerCount: toInt(row.active_learner_count),
  });
}

function applyCourseOverviewFilters(
  overviews: CourseOverview[],
  input?: {
    query?: string | null;
    premiumFilter?: 'all' | 'free' | 'premium';
    minRating?: number | null;
    sort?: 'newest' | 'most_popular' | 'best_rated';
    domainSlug?: string | null;
  }
) {
  let filtered = overviews;

  if (input?.query?.trim()) {
    filtered = filtered.filter((course) =>
      matchesCourseSearch({
        query: input.query ?? '',
        title: course.title,
        description: course.description,
        creatorName: course.creatorName ?? null,
        domainName: course.domainName ?? null,
      })
    );
  }

  if (input?.domainSlug?.trim()) {
    filtered = filtered.filter((course) => course.domainSlug === input.domainSlug);
  }

  if (input?.premiumFilter === 'free') {
    filtered = filtered.filter((course) => !course.premiumEnabled || course.priceAmount <= 0 || course.premiumAccessDays == null);
  } else if (input?.premiumFilter === 'premium') {
    filtered = filtered.filter((course) => course.premiumEnabled && course.priceAmount > 0 && course.premiumAccessDays != null);
  }

  const minRating = input?.minRating ?? null;
  if (typeof minRating === 'number' && minRating > 0) {
    filtered = filtered.filter((course) => course.engagement.averageRating >= minRating);
  }

  return sortCourseOverviews(filtered, input?.sort ?? 'newest');
}

function sanitizeSearchQuery(query: string) {
  return query.trim().toLowerCase();
}

function normalizeDomainName(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
}

function matchesCourseSearch(input: {
  query: string;
  title: string;
  description: string;
  creatorName: string | null;
  domainName: string | null;
}) {
  const normalizedQuery = sanitizeSearchQuery(input.query);
  if (!normalizedQuery) {
    return true;
  }

  return [input.title, input.description, input.creatorName ?? '', input.domainName ?? '']
    .map((value) => value.trim().toLowerCase())
    .some((value) => value.includes(normalizedQuery));
}

function sortCourseOverviews<T extends CourseOverview>(
  courses: T[],
  sort: 'newest' | 'most_popular' | 'best_rated'
) {
  const clone = [...courses];

  if (sort === 'best_rated') {
    return clone.sort((left, right) => {
      if (right.engagement.averageRating !== left.engagement.averageRating) {
        return right.engagement.averageRating - left.engagement.averageRating;
      }

      if (right.engagement.totalReviews !== left.engagement.totalReviews) {
        return right.engagement.totalReviews - left.engagement.totalReviews;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  if (sort === 'most_popular') {
    return clone.sort((left, right) => {
      if (right.engagement.activeLearnerCount !== left.engagement.activeLearnerCount) {
        return right.engagement.activeLearnerCount - left.engagement.activeLearnerCount;
      }

      if (right.engagement.wishlistCount !== left.engagement.wishlistCount) {
        return right.engagement.wishlistCount - left.engagement.wishlistCount;
      }

      if (right.engagement.totalReviews !== left.engagement.totalReviews) {
        return right.engagement.totalReviews - left.engagement.totalReviews;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  return clone.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function nextPosition<T extends { position: number }>(rows: T[]) {
  return rows.length ? Math.max(...rows.map((row) => row.position)) + 1 : 1;
}

export class SupabaseCourseRepository implements CourseRepository {
  constructor(
    private readonly supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  private async listCourseOverviewsFromReadModel(input: {
    courseIds?: string[];
    creatorUserId?: string;
    publishedOnly?: boolean;
    query?: string | null;
    premiumFilter?: 'all' | 'free' | 'premium';
    minRating?: number | null;
    sort?: 'newest' | 'most_popular' | 'best_rated';
    domainSlug?: string | null;
  } = {}) {
    let query: any = this.serviceSupabase
      .from('v_course_overview_read_model' as any)
      .select('*');

    if (input.courseIds?.length) {
      query = query.in('id', Array.from(new Set(input.courseIds)) as any);
    }

    if (input.creatorUserId) {
      query = query.eq('creator_user_id', input.creatorUserId as any);
    }

    if (input.publishedOnly) {
      query = query.eq('status', 'published' as any);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const rows = ((data ?? []) as unknown) as CourseOverviewReadModelRow[];
    const overviews = rows.map(mapCourseOverviewReadModel);
    return applyCourseOverviewFilters(overviews, input);
  }

  private async loadCourseOverviews(courseRows: CourseRow[]) {
    if (courseRows.length === 0) {
      return [];
    }

    const courseIds = courseRows.map((course) => course.id);
    const creatorIds = Array.from(new Set(courseRows.map((course) => course.creator_user_id)));
    const domainIds = Array.from(new Set(courseRows.map((course) => course.course_domain_id).filter(Boolean) as string[]));
    const nowIso = new Date().toISOString();
    const [
      { data: moduleRows, error: moduleError },
      { data: reviewRows, error: reviewError },
      { data: wishlistRows, error: wishlistError },
      { data: entitlementRows, error: entitlementError },
      { data: creatorRows, error: creatorError },
      domainResponse,
    ] = await Promise.all([
      this.serviceSupabase
        .from('course_modules')
        .select('id, course_id')
        .in('course_id', courseIds),
      this.serviceSupabase
        .from('course_reviews')
        .select('course_id, rating')
        .in('course_id', courseIds)
        .eq('is_deleted', false),
      this.serviceSupabase
        .from('course_wishlist_entries')
        .select('course_id')
        .in('course_id', courseIds),
      this.serviceSupabase
        .from('course_entitlements')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('status', 'active')
        .gt('expires_at', nowIso),
      this.serviceSupabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds),
      domainIds.length > 0
        ? this.serviceSupabase
            .from('course_domains' as any)
            .select('id, name, slug')
            .in('id', domainIds as any)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (moduleError) throw moduleError;
    if (reviewError) throw reviewError;
    if (wishlistError) throw wishlistError;
    if (entitlementError) throw entitlementError;
    if (creatorError) throw creatorError;
    if ((domainResponse as any).error) throw (domainResponse as any).error;

    const creatorNameById = new Map((creatorRows ?? []).map((row) => [row.user_id, row.full_name]));
    const domainById = new Map<string, { id: string; name: string; slug: string }>(
      (((domainResponse as any).data ?? []) as Array<{ id: string; name: string; slug: string }>)
        .map((row) => [row.id, row])
    );

    const moduleCountByCourseId = new Map<string, number>();
    const courseIdByModuleId = new Map<string, string>();

    for (const moduleRow of moduleRows ?? []) {
      courseIdByModuleId.set(moduleRow.id, moduleRow.course_id);
      moduleCountByCourseId.set(moduleRow.course_id, (moduleCountByCourseId.get(moduleRow.course_id) ?? 0) + 1);
    }

    const moduleIds = (moduleRows ?? []).map((moduleRow) => moduleRow.id);
    const nodeCountByCourseId = new Map<string, number>();
    const premiumNodeCountByCourseId = new Map<string, number>();
    const ratingTotalsByCourseId = new Map<string, { total: number; count: number }>();
    const wishlistCountByCourseId = new Map<string, number>();
    const activeLearnerCountByCourseId = new Map<string, number>();

    if (moduleIds.length > 0) {
      const { data: nodeRows, error: nodeError } = await this.serviceSupabase
        .from('course_nodes')
        .select('module_id, is_premium')
        .in('module_id', moduleIds);

      if (nodeError) throw nodeError;

      for (const nodeRow of nodeRows ?? []) {
        const courseId = courseIdByModuleId.get(nodeRow.module_id);
        if (!courseId) continue;
        nodeCountByCourseId.set(courseId, (nodeCountByCourseId.get(courseId) ?? 0) + 1);
        if (nodeRow.is_premium) {
          premiumNodeCountByCourseId.set(courseId, (premiumNodeCountByCourseId.get(courseId) ?? 0) + 1);
        }
      }
    }

    for (const reviewRow of reviewRows ?? []) {
      const current = ratingTotalsByCourseId.get(reviewRow.course_id) ?? { total: 0, count: 0 };
      current.total += Number(reviewRow.rating);
      current.count += 1;
      ratingTotalsByCourseId.set(reviewRow.course_id, current);
    }

    for (const wishlistRow of wishlistRows ?? []) {
      wishlistCountByCourseId.set(wishlistRow.course_id, (wishlistCountByCourseId.get(wishlistRow.course_id) ?? 0) + 1);
    }

    for (const entitlementRow of entitlementRows ?? []) {
      activeLearnerCountByCourseId.set(entitlementRow.course_id, (activeLearnerCountByCourseId.get(entitlementRow.course_id) ?? 0) + 1);
    }

    return courseRows.map((courseRow) => {
      const ratings = ratingTotalsByCourseId.get(courseRow.id) ?? { total: 0, count: 0 };
      const domain = courseRow.course_domain_id ? domainById.get(courseRow.course_domain_id) ?? null : null;
      return mapCourseOverview(courseRow, {
        creatorName: creatorNameById.get(courseRow.creator_user_id) ?? null,
        domainName: domain?.name ?? null,
        domainSlug: domain?.slug ?? null,
        moduleCount: moduleCountByCourseId.get(courseRow.id) ?? 0,
        nodeCount: nodeCountByCourseId.get(courseRow.id) ?? 0,
        premiumNodeCount: premiumNodeCountByCourseId.get(courseRow.id) ?? 0,
        wishlistCount: wishlistCountByCourseId.get(courseRow.id) ?? 0,
        averageRating: ratings.count > 0 ? Number((ratings.total / ratings.count).toFixed(2)) : 0,
        totalReviews: ratings.count,
        activeLearnerCount: activeLearnerCountByCourseId.get(courseRow.id) ?? 0,
      });
    });
  }

  private async resolveCourseDomainId(domainName: string | null | undefined, creatorUserId: string) {
    const trimmed = domainName?.trim() ?? '';
    if (!trimmed) return null;

    const normalized = normalizeDomainName(trimmed);
    const slug = slugify(normalized);
    const existingResponse = await this.serviceSupabase
      .from('course_domains' as any)
      .select('id')
      .eq('normalized_name', normalized)
      .maybeSingle();

    if ((existingResponse as any).error) throw (existingResponse as any).error;
    if ((existingResponse as any).data?.id) return (existingResponse as any).data.id as string;

    const createResponse = await this.serviceSupabase
      .from('course_domains' as any)
      .insert({
        name: trimmed.replace(/\s+/g, ' '),
        slug,
        normalized_name: normalized,
        created_by_user_id: creatorUserId,
      } as any)
      .select('id')
      .single();

    if ((createResponse as any).error) {
      const fallback = await this.serviceSupabase
        .from('course_domains' as any)
        .select('id')
        .eq('normalized_name', normalized)
        .maybeSingle();
      if ((fallback as any).error) throw (fallback as any).error;
      if ((fallback as any).data?.id) return (fallback as any).data.id as string;
      throw (createResponse as any).error;
    }

    return (createResponse as any).data.id as string;
  }

  private async normalizeModulePositions(courseId: string) {
    const { data, error } = await this.supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId)
      .order('position', { ascending: true });

    if (error) {
      throw error;
    }

    await Promise.all(
      (data ?? []).map((module, index) =>
        this.supabase
          .from('course_modules')
          .update({ position: index + 1 })
          .eq('id', module.id)
          .eq('course_id', courseId)
      )
    );
  }

  private async normalizeNodePositions(moduleId: string) {
    const { data, error } = await this.supabase
      .from('course_nodes')
      .select('id')
      .eq('module_id', moduleId)
      .order('position', { ascending: true });

    if (error) {
      throw error;
    }

    await Promise.all(
      (data ?? []).map((node, index) =>
        this.supabase
          .from('course_nodes')
          .update({ position: index + 1 })
          .eq('id', node.id)
          .eq('module_id', moduleId)
      )
    );
  }

  async createCourse(input: {
    creatorUserId: string;
    title: string;
    slug: string;
    description: string;
    imageUrl: string | null;
    domainName?: string | null;
    priceAmount: number;
    premiumEnabled: boolean;
    premiumAccessDays: number | null;
    status: CourseRow['status'];
  }) {
    const courseDomainId = await this.resolveCourseDomainId(input.domainName, input.creatorUserId);
    const { data, error } = await this.supabase
      .from('courses')
      .insert({
        creator_user_id: input.creatorUserId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        image_url: input.imageUrl,
        course_domain_id: courseDomainId,
        price_amount: input.priceAmount,
        premium_enabled: input.premiumEnabled,
        premium_access_days: input.premiumAccessDays,
        premium_updated_at: input.premiumEnabled ? new Date().toISOString() : null,
        status: input.status,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCourse(data);
  }

  async updateCourse(input: {
    courseId: string;
    creatorUserId: string;
    title: string;
    slug: string;
    description: string;
    imageUrl: string | null;
    domainName?: string | null;
    priceAmount: number;
    premiumEnabled: boolean;
    premiumAccessDays: number | null;
    status: CourseRow['status'];
  }) {
    const courseDomainId = await this.resolveCourseDomainId(input.domainName, input.creatorUserId);
    const { data, error } = await this.supabase
      .from('courses')
      .update({
        title: input.title,
        slug: input.slug,
        description: input.description,
        image_url: input.imageUrl,
        course_domain_id: courseDomainId,
        price_amount: input.priceAmount,
        premium_enabled: input.premiumEnabled,
        premium_access_days: input.premiumAccessDays,
        premium_updated_at: new Date().toISOString(),
        status: input.status,
      })
      .eq('id', input.courseId)
      .eq('creator_user_id', input.creatorUserId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCourse(data);
  }

  async getCourseById(courseId: string) {
    const { data, error } = await this.serviceSupabase.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (error) {
      throw error;
    }

    return data ? mapCourse(data) : null;
  }

  async getCourseDetailById(courseId: string) {
    const { data: courseRow, error: courseError } = await this.serviceSupabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) throw courseError;
    if (!courseRow) return null;

    const [profileResponse, moduleResponse, domainResponse] = await Promise.all([
      this.serviceSupabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', courseRow.creator_user_id)
        .maybeSingle(),
      this.serviceSupabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true }),
      courseRow.course_domain_id
        ? this.serviceSupabase.from('course_domains' as any).select('name, slug').eq('id', courseRow.course_domain_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (profileResponse.error) throw profileResponse.error;
    if (moduleResponse.error) throw moduleResponse.error;
    if ((domainResponse as any).error) throw (domainResponse as any).error;

    const moduleIds = (moduleResponse.data ?? []).map((module) => module.id);
    let nodeRows: NodeRow[] = [];

    if (moduleIds.length > 0) {
      const { data, error } = await this.serviceSupabase
        .from('course_nodes')
        .select('*')
        .in('module_id', moduleIds)
        .order('position', { ascending: true });

      if (error) throw error;
      nodeRows = data ?? [];
    }

    return mapCourseDetail({
      courseRow,
      creatorName: profileResponse.data?.full_name ?? null,
      domainName: (domainResponse as any).data?.name ?? null,
      domainSlug: (domainResponse as any).data?.slug ?? null,
      moduleRows: moduleResponse.data ?? [],
      nodeRows,
    });
  }

  async getCourseTreeById(courseId: string) {
    const { data: courseRow, error: courseError } = await this.serviceSupabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) throw courseError;
    if (!courseRow) return null;

    const [profileResponse, moduleResponse, domainResponse] = await Promise.all([
      this.serviceSupabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', courseRow.creator_user_id)
        .maybeSingle(),
      this.serviceSupabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true }),
      courseRow.course_domain_id
        ? this.serviceSupabase.from('course_domains' as any).select('name, slug').eq('id', courseRow.course_domain_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (profileResponse.error) throw profileResponse.error;
    if (moduleResponse.error) throw moduleResponse.error;
    if ((domainResponse as any).error) throw (domainResponse as any).error;

    const moduleIds = (moduleResponse.data ?? []).map((module) => module.id);
    let nodeRows: Array<Pick<NodeRow, 'id' | 'module_id' | 'type' | 'title' | 'is_premium' | 'excerpt' | 'position' | 'created_at' | 'updated_at'>> = [];

    if (moduleIds.length > 0) {
      const { data, error } = await this.serviceSupabase
        .from('course_nodes')
        .select('id, module_id, type, title, is_premium, excerpt, position, created_at, updated_at')
        .in('module_id', moduleIds)
        .order('position', { ascending: true });

      if (error) throw error;
      nodeRows = data ?? [];
    }

    return mapCourseTreeDetail({
      courseRow,
      creatorName: profileResponse.data?.full_name ?? null,
      domainName: (domainResponse as any).data?.name ?? null,
      domainSlug: (domainResponse as any).data?.slug ?? null,
      moduleRows: moduleResponse.data ?? [],
      nodeRows,
    });
  }

  async listCourseTreesByIds(courseIds: string[]) {
    if (courseIds.length === 0) return [];

    const uniqueCourseIds = Array.from(new Set(courseIds));
    const { data: courseRows, error: courseError } = await this.serviceSupabase
      .from('courses')
      .select('*')
      .in('id', uniqueCourseIds);

    if (courseError) throw courseError;
    if (!courseRows || courseRows.length === 0) return [];

    const creatorIds = Array.from(new Set(courseRows.map((row) => row.creator_user_id)));
    const domainIds = Array.from(new Set(courseRows.map((row) => row.course_domain_id).filter(Boolean) as string[]));
    const [creatorResponse, moduleResponse, domainResponse] = await Promise.all([
      this.serviceSupabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds),
      this.serviceSupabase
        .from('course_modules')
        .select('*')
        .in('course_id', uniqueCourseIds)
        .order('position', { ascending: true }),
      domainIds.length > 0
        ? this.serviceSupabase.from('course_domains' as any).select('id, name, slug').in('id', domainIds as any)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (creatorResponse.error) throw creatorResponse.error;
    if (moduleResponse.error) throw moduleResponse.error;
    if ((domainResponse as any).error) throw (domainResponse as any).error;

    const moduleRows = moduleResponse.data ?? [];
    const moduleIds = moduleRows.map((module) => module.id);
    let nodeRows: Array<Pick<NodeRow, 'id' | 'module_id' | 'type' | 'title' | 'is_premium' | 'excerpt' | 'position' | 'created_at' | 'updated_at'>> = [];
    if (moduleIds.length > 0) {
      const { data, error } = await this.serviceSupabase
        .from('course_nodes')
        .select('id, module_id, type, title, is_premium, excerpt, position, created_at, updated_at')
        .in('module_id', moduleIds)
        .order('position', { ascending: true });
      if (error) throw error;
      nodeRows = data ?? [];
    }

    const creatorNameById = new Map((creatorResponse.data ?? []).map((row) => [row.user_id, row.full_name]));
    const domainById = new Map<string, { id: string; name: string; slug: string }>(
      (((domainResponse as any).data ?? []) as Array<{ id: string; name: string; slug: string }>)
        .map((row) => [row.id, row])
    );
    const moduleRowsByCourseId = new Map<string, ModuleRow[]>();
    const courseIdByModuleId = new Map<string, string>();

    for (const moduleRow of moduleRows) {
      const current = moduleRowsByCourseId.get(moduleRow.course_id) ?? [];
      current.push(moduleRow);
      moduleRowsByCourseId.set(moduleRow.course_id, current);
      courseIdByModuleId.set(moduleRow.id, moduleRow.course_id);
    }

    const nodeRowsByCourseId = new Map<string, typeof nodeRows>();
    for (const nodeRow of nodeRows) {
      const courseId = courseIdByModuleId.get(nodeRow.module_id);
      if (!courseId) continue;
      const current = nodeRowsByCourseId.get(courseId) ?? [];
      current.push(nodeRow);
      nodeRowsByCourseId.set(courseId, current);
    }

    return courseRows
      .map((courseRow) => {
        const domain = courseRow.course_domain_id ? domainById.get(courseRow.course_domain_id) ?? null : null;
        return mapCourseTreeDetail({
          courseRow,
          creatorName: creatorNameById.get(courseRow.creator_user_id) ?? null,
          domainName: domain?.name ?? null,
          domainSlug: domain?.slug ?? null,
          moduleRows: moduleRowsByCourseId.get(courseRow.id) ?? [],
          nodeRows: nodeRowsByCourseId.get(courseRow.id) ?? [],
        });
      })
      .sort((left, right) => uniqueCourseIds.indexOf(left.id) - uniqueCourseIds.indexOf(right.id));
  }

  async listCourseOverviewsByIds(courseIds: string[]) {
    if (courseIds.length === 0) {
      return [];
    }

    const uniqueCourseIds = Array.from(new Set(courseIds));
    try {
      const overviews = await this.listCourseOverviewsFromReadModel({ courseIds: uniqueCourseIds });
      return overviews.sort((left, right) => uniqueCourseIds.indexOf(left.id) - uniqueCourseIds.indexOf(right.id));
    } catch (error) {
      // Keep local/dev projects working until the v22.8.2 read-model migration is applied.
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }

    const { data, error } = await this.serviceSupabase
      .from('courses')
      .select('*')
      .in('id', uniqueCourseIds);

    if (error) {
      throw error;
    }

    const overviews = await this.loadCourseOverviews(data ?? []);
    return overviews.sort((left, right) => uniqueCourseIds.indexOf(left.id) - uniqueCourseIds.indexOf(right.id));
  }

  async getReadableNodeById(nodeId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_nodes')
      .select('*')
      .eq('id', nodeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapCourseNode(data) : null;
  }

  async listCreatorCourses(creatorUserId: string) {
    try {
      return await this.listCourseOverviewsFromReadModel({ creatorUserId, sort: 'newest' });
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }

    const { data, error } = await this.serviceSupabase
      .from('courses')
      .select('*')
      .eq('creator_user_id', creatorUserId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return this.loadCourseOverviews(data ?? []);
  }

  async listPublishedCourses(input?: {
    query?: string | null;
    premiumFilter?: 'all' | 'free' | 'premium';
    minRating?: number | null;
    sort?: 'newest' | 'most_popular' | 'best_rated';
    domainSlug?: string | null;
  }) {
    try {
      return await this.listCourseOverviewsFromReadModel({ ...input, publishedOnly: true });
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }

    const { data, error } = await this.serviceSupabase
      .from('courses')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return applyCourseOverviewFilters(await this.loadCourseOverviews(data ?? []), input);
  }

  async listPublishedCoursesByCreator(creatorUserId: string) {
    try {
      return await this.listCourseOverviewsFromReadModel({ creatorUserId, publishedOnly: true, sort: 'newest' });
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }

    const { data, error } = await this.serviceSupabase
      .from('courses')
      .select('*')
      .eq('creator_user_id', creatorUserId)
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return this.loadCourseOverviews(data ?? []);
  }

  async createModule(input: { courseId: string; title: string; summary: string }) {
    const { data: existingRows, error: existingError } = await this.supabase
      .from('course_modules')
      .select('position')
      .eq('course_id', input.courseId);

    if (existingError) {
      throw existingError;
    }

    const { data, error } = await this.supabase
      .from('course_modules')
      .insert({
        course_id: input.courseId,
        title: input.title,
        summary: input.summary,
        position: await nextPosition(existingRows ?? []),
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return {
      ...mapCourseModule(data),
      nodes: [],
    };
  }

  async updateModule(input: { moduleId: string; title: string; summary: string }) {
    const { error } = await this.supabase
      .from('course_modules')
      .update({
        title: input.title,
        summary: input.summary,
      })
      .eq('id', input.moduleId);

    if (error) {
      throw error;
    }
  }

  async deleteModule(input: { courseId: string; moduleId: string }) {
    const { error } = await this.supabase
      .from('course_modules')
      .delete()
      .eq('id', input.moduleId)
      .eq('course_id', input.courseId);

    if (error) {
      throw error;
    }

    await this.normalizeModulePositions(input.courseId);
  }

  async reorderModules(input: { courseId: string; moduleIdsInOrder: string[] }) {
    await Promise.all(
      input.moduleIdsInOrder.map((moduleId, index) =>
        this.supabase
          .from('course_modules')
          .update({ position: index + 1 })
          .eq('id', moduleId)
          .eq('course_id', input.courseId)
      )
    );
  }

  async createNode(input: {
    moduleId: string;
    type: NodeRow['type'];
    title: string;
    payload: CourseNode['payload'];
    isPremium: boolean;
    excerpt: string | null;
  }) {
    const { data: existingRows, error: existingError } = await this.supabase
      .from('course_nodes')
      .select('position')
      .eq('module_id', input.moduleId);

    if (existingError) {
      throw existingError;
    }

    const { data, error } = await this.supabase
      .from('course_nodes')
      .insert({
        module_id: input.moduleId,
        type: input.type,
        title: input.title,
        payload: input.payload as unknown as Database['public']['Tables']['course_nodes']['Insert']['payload'],
        is_premium: input.isPremium,
        excerpt: input.excerpt,
        position: await nextPosition(existingRows ?? []),
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCourseNode(data);
  }

  async updateNode(input: {
    nodeId: string;
    title: string;
    payload: CourseNode['payload'];
    isPremium: boolean;
    excerpt: string | null;
  }) {
    const { error } = await this.supabase
      .from('course_nodes')
      .update({
        title: input.title,
        payload: input.payload as unknown as Database['public']['Tables']['course_nodes']['Update']['payload'],
        is_premium: input.isPremium,
        excerpt: input.excerpt,
      })
      .eq('id', input.nodeId);

    if (error) {
      throw error;
    }
  }

  async deleteNode(input: { moduleId: string; nodeId: string }) {
    const { error } = await this.supabase
      .from('course_nodes')
      .delete()
      .eq('id', input.nodeId)
      .eq('module_id', input.moduleId);

    if (error) {
      throw error;
    }

    await this.normalizeNodePositions(input.moduleId);
  }

  async reorderNodes(input: { moduleId: string; nodeIdsInOrder: string[] }) {
    await Promise.all(
      input.nodeIdsInOrder.map((nodeId, index) =>
        this.supabase
          .from('course_nodes')
          .update({ position: index + 1 })
          .eq('id', nodeId)
          .eq('module_id', input.moduleId)
      )
    );
  }

  async saveQuizAttempt(input: {
    courseId: string;
    nodeId: string;
    learnerUserId: string;
    score: number;
    maxScore: number;
    answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  }) {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .insert({
        course_id: input.courseId,
        node_id: input.nodeId,
        learner_user_id: input.learnerUserId,
        score: input.score,
        max_score: input.maxScore,
        answers: input.answers as unknown as Database['public']['Tables']['quiz_attempts']['Insert']['answers'],
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapQuizAttempt(data);
  }
}

