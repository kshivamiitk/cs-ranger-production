import { NextResponse } from 'next/server';

import { applyGuestThemeCookie } from '@/lib/appCookies';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { themeModeSchema } from '@/src/presentation/schemas';
import { failure, readJsonWithLimit } from '@/src/presentation/http/routeUtils';

function isRecoverableThemePersistenceError(error: unknown) {
  return error instanceof Error && (
    error.message.includes('NEXT_PUBLIC_SUPABASE_URL') ||
    error.message.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    error.message.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    error.message.includes('SUPABASE_SERVICE_ROLE_KEY')
  );
}

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'theme');
    if (rateLimited) return rateLimited;

    const parsed = themeModeSchema.parse(await readJsonWithLimit(request, 2 * 1024));
    const response = NextResponse.json({ themeMode: parsed.themeMode, persisted: false });

    try {
      const { authService } = await createServerContainer({ writeCookies: true });
      const context = await authService.getViewerContext(parsed.themeMode);

      if (context.viewer) {
        await authService.updateThemeMode(context.viewer.user.id, parsed.themeMode);
        const persistedResponse = NextResponse.json({ themeMode: parsed.themeMode, persisted: true });
        applyGuestThemeCookie(persistedResponse, parsed.themeMode);
        return persistedResponse;
      }
    } catch (error) {
      if (!isRecoverableThemePersistenceError(error)) {
        throw error;
      }
    }

    applyGuestThemeCookie(response, parsed.themeMode);
    return response;
  } catch (error) {
    return failure(error, request);
  }
}


