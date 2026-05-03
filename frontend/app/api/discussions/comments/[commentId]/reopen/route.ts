// Auto-generated v21 route bridge with local API timing.
// Backend team owns the implementation; this file only mounts it for Next.js local/full-stack execution.
import { withApiTiming } from '@/lib/apiRouteTiming';
import * as backendRoute from '../../../../../../../backend/Learning Engine/routes/discussions/comments/[commentId]/reopen/route.ts';

export const POST = withApiTiming(backendRoute.POST, 'POST');
