// Auto-generated v21 route bridge with local API timing.
// Backend team owns the implementation; this file only mounts it for Next.js local/full-stack execution.
import { withApiTiming } from '@/lib/apiRouteTiming';
import * as backendRoute from '../../../../../../backend/Learner and Creator Product/routes/creator/modules/[moduleId]/route.ts';

export const PATCH = withApiTiming(backendRoute.PATCH, 'PATCH');
export const DELETE = withApiTiming(backendRoute.DELETE, 'DELETE');
